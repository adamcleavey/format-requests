import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { Pool, PoolClient } from "pg";
import { Server } from "http";
import path from "path";
import fs from "fs";

/**
 * server.ts
 *
 * Typed Express + pg API for Format Poker
 *
 * Expects environment variables:
 *  - DATABASE_URL: Postgres connection string
 *  - ADMIN_KEY: simple admin auth key (optional; defaults to "change-me")
 *
 * Endpoints:
 *  - GET    /api/formats
 *  - GET    /api/formats/:id
 *  - POST   /api/formats             (admin)
 *  - PUT    /api/formats/:id/status  (admin)
 *  - DELETE /api/formats/:id         (admin)
 *  - POST   /api/formats/:id/vote
 *  - GET    /health
 *
 * Build:
 *  - tsc -p tsconfig.server.json
 * Run (after build):
 *  - node dist/server.js
 *
 * During development:
 *  - ts-node-dev --respawn --transpile-only server.ts
 */

/* --- Types --- */
type FormatRow = {
  id: string;
  name: string;
  kind: string;
  status: string;
  created_at: string;
  votes: number;
};

/* --- Config --- */
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-me";
const NODE_ENV = process.env.NODE_ENV || "development";

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Exiting.");
  process.exit(1);
}

/* --- Postgres pool --- */
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

/* --- App setup --- */
const app = express();

const clientDist = path.join(__dirname, "client");

let indexHtml = "";
try {
  indexHtml = fs.readFileSync(path.join(clientDist, "index.html"), "utf8");
} catch (err) {
  console.warn("Could not read index.html at startup:", err);
  indexHtml = "";
}

app.use(cors()); // Consider locking origin in production
app.use(helmet());
app.use(express.json());
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

/* --- Helpers --- */
function sendError(res: Response, status = 500, error = "server_error") {
  return res.status(status).json({ error });
}

function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  // Accept admin key via header `x-admin-key`, body.adminKey, or query.adminKey
  const headerKey = req.get("x-admin-key");
  const bodyKey = (req.body && (req.body as any).adminKey) || undefined;
  const queryKey = (req.query && (req.query as any).adminKey) || undefined;
  const key = headerKey || bodyKey || queryKey;
  if (!key || String(key) !== ADMIN_KEY) {
    // send unauthorized via res if used directly, but as middleware, call next with error
    return (req.res || ({} as Response))
      .status(401)
      .json({ error: "unauthorized" });
  }
  return next();
}

/* --- Routes --- */

/* --- Server Sent Events for live vote updates --- */
const sseClients: Set<Response> = new Set();

app.get("/api/live", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write("\n");
  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
  });
});

function broadcastVote(id: string, votes: number) {
  const payload = `data: ${JSON.stringify({ id, votes })}\n\n`;
  for (const client of Array.from(sseClients)) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Heartbeat to keep connections alive
setInterval(() => {
  for (const client of Array.from(sseClients)) {
    try {
      client.write(":ping\n\n");
    } catch {
      sseClients.delete(client);
    }
  }
}, 30000);

/**
 * GET /api/formats
 * Query params:
 *   - q: search string (substring on name, case-insensitive)
 *   - kind: exact kind
 *   - status: exact status
 *   - sort: votes-desc (default), votes-asc, name-asc, name-desc, newest
 */
app.get("/api/formats", async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const kind = typeof req.query.kind === "string" ? req.query.kind.trim() : "";
  const status =
    typeof req.query.status === "string" ? req.query.status.trim() : "";
  const sort =
    typeof req.query.sort === "string"
      ? req.query.sort.trim().toLowerCase()
      : "votes-desc";

  const whereClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (q) {
    whereClauses.push(`LOWER(name) LIKE $${idx++}`);
    values.push(`%${q.toLowerCase()}%`);
  }
  if (kind) {
    whereClauses.push(`kind = $${idx++}`);
    values.push(kind);
  }
  if (status) {
    whereClauses.push(`status = $${idx++}`);
    values.push(status);
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  let orderSql = "ORDER BY votes DESC, created_at DESC";
  switch (sort) {
    case "votes-asc":
      orderSql = "ORDER BY votes ASC, created_at DESC";
      break;
    case "name-asc":
      orderSql = "ORDER BY name ASC";
      break;
    case "name-desc":
      orderSql = "ORDER BY name DESC";
      break;
    case "newest":
      orderSql = "ORDER BY created_at DESC";
      break;
    case "votes-desc":
    default:
      orderSql = "ORDER BY votes DESC, created_at DESC";
      break;
  }

  const sql = `SELECT id, name, kind, status, created_at, votes FROM formats ${whereSql} ${orderSql};`;

  try {
    const { rows } = await pool.query<FormatRow>(sql, values);
    return res.json(rows);
  } catch (err) {
    console.error("GET /api/formats error:", err);
    return sendError(res, 500, "db_error");
  }
});

/**
 * GET /api/formats/:id
 */
app.get("/api/formats/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const { rows } = await pool.query<FormatRow>(
      "SELECT id, name, kind, status, created_at, votes FROM formats WHERE id = $1",
      [id],
    );
    if (!rows || rows.length === 0) return sendError(res, 404, "not_found");
    return res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/formats/:id error:", err);
    return sendError(res, 500, "db_error");
  }
});

/**
 * POST /api/formats (admin)
 */
app.post(
  "/api/formats",
  (req: Request, res: Response, next: NextFunction) => {
    // wrap requireAdmin to ensure we can return a response if unauthorized
    const headerKey = req.get("x-admin-key");
    const bodyKey = (req.body && (req.body as any).adminKey) || undefined;
    const queryKey = (req.query && (req.query as any).adminKey) || undefined;
    const key = headerKey || bodyKey || queryKey;
    if (!key || String(key) !== ADMIN_KEY) {
      return res.status(401).json({ error: "unauthorized" });
    }
    return next();
  },
  async (req: Request, res: Response) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const kind = typeof req.body?.kind === "string" ? req.body.kind.trim() : "";
    const status =
      typeof req.body?.status === "string" ? req.body.status.trim() : "";

    if (!name || !kind || !status) return sendError(res, 400, "missing_fields");

    try {
      const { rows } = await pool.query<FormatRow>(
        "INSERT INTO formats (name, kind, status) VALUES ($1, $2, $3) RETURNING id, name, kind, status, created_at, votes",
        [name, kind, status],
      );
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error("POST /api/formats error:", err);
      return sendError(res, 500, "db_error");
    }
  },
);

/**
 * PUT /api/formats/:id/status (admin)
 */
app.put(
  "/api/formats/:id/status",
  (req: Request, res: Response, next: NextFunction) => {
    const headerKey = req.get("x-admin-key");
    const bodyKey = (req.body && (req.body as any).adminKey) || undefined;
    const queryKey = (req.query && (req.query as any).adminKey) || undefined;
    const key = headerKey || bodyKey || queryKey;
    if (!key || String(key) !== ADMIN_KEY) {
      return res.status(401).json({ error: "unauthorized" });
    }
    return next();
  },
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const status =
      typeof req.body?.status === "string" ? req.body.status.trim() : "";
    if (!status) return sendError(res, 400, "missing_status");

    try {
      const { rows } = await pool.query<FormatRow>(
        "UPDATE formats SET status = $1 WHERE id = $2 RETURNING id, name, kind, status, created_at, votes",
        [status, id],
      );
      if (!rows || rows.length === 0) return sendError(res, 404, "not_found");
      return res.json(rows[0]);
    } catch (err) {
      console.error("PUT /api/formats/:id/status error:", err);
      return sendError(res, 500, "db_error");
    }
  },
);

/**
 * DELETE /api/formats/:id (admin)
 */
app.delete(
  "/api/formats/:id",
  (req: Request, res: Response, next: NextFunction) => {
    const headerKey = req.get("x-admin-key");
    const bodyKey = (req.body && (req.body as any).adminKey) || undefined;
    const queryKey = (req.query && (req.query as any).adminKey) || undefined;
    const key = headerKey || bodyKey || queryKey;
    if (!key || String(key) !== ADMIN_KEY) {
      return res.status(401).json({ error: "unauthorized" });
    }
    return next();
  },
  async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
      await pool.query("DELETE FROM votes WHERE format_id = $1", [id]);
      await pool.query("DELETE FROM formats WHERE id = $1", [id]);
      return res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/formats/:id error:", err);
      return sendError(res, 500, "db_error");
    }
  },
);

/**
 * GET /api/votes/:deviceId
 * Returns an array of format IDs that the given device has voted for.
 */
app.get("/api/votes/:deviceId", async (req: Request, res: Response) => {
  const deviceId = req.params.deviceId;
  if (!deviceId) return sendError(res, 400, "missing_deviceId");
  try {
    const { rows } = await pool.query<{ format_id: string }>(
      "SELECT format_id FROM votes WHERE device_id = $1",
      [deviceId],
    );
    return res.json(rows.map((r) => r.format_id));
  } catch (err) {
    console.error("GET /api/votes/:deviceId error:", err);
    return sendError(res, 500, "db_error");
  }
});

/**
 * POST /api/formats/:id/vote
 * body: { deviceId: string }
 * toggles vote (insert/delete) and returns { voted, votes }
 */
app.post("/api/formats/:id/vote", async (req: Request, res: Response) => {
  const id = req.params.id;
  const deviceId =
    typeof req.body?.deviceId === "string" ? req.body.deviceId : undefined;
  if (!deviceId) return sendError(res, 400, "missing_deviceId");

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const existsRes = await client.query(
      "SELECT 1 FROM votes WHERE device_id = $1 AND format_id = $2",
      [deviceId, id],
    );

    let voted: boolean;
    if (existsRes.rowCount === 0) {
      await client.query(
        "INSERT INTO votes (device_id, format_id) VALUES ($1, $2)",
        [deviceId, id],
      );
      await client.query("UPDATE formats SET votes = votes + 1 WHERE id = $1", [
        id,
      ]);
      voted = true;
    } else {
      await client.query(
        "DELETE FROM votes WHERE device_id = $1 AND format_id = $2",
        [deviceId, id],
      );
      await client.query(
        "UPDATE formats SET votes = GREATEST(votes - 1, 0) WHERE id = $1",
        [id],
      );
      voted = false;
    }

    const vres = await client.query<{ votes: number }>(
      "SELECT votes FROM formats WHERE id = $1",
      [id],
    );
    await client.query("COMMIT");
    const votes = vres.rows[0] ? Number(vres.rows[0].votes || 0) : 0;
    broadcastVote(id, votes);
    return res.json({ voted, votes });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback errors
      }
    }
    console.error("POST /api/formats/:id/vote error:", err);
    return sendError(res, 500, "db_error");
  } finally {
    if (client) client.release();
  }
});

/* Healthcheck */
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

// Serve static client files (built into dist/client)
// This ensures the production server responds to "/" and serves the SPA.
app.use(express.static(clientDist));

// Fallback to index.html for client-side routing (SPA)
app.get("*", (_req: Request, res: Response) => {
  if (indexHtml) {
    return res.status(200).send(indexHtml);
  }
  // fallback: send a minimal HTML if index not available
  res
    .status(200)
    .send(
      "<!doctype html><html><head></head><body><div id=\"root\"></div></body></html>",
    );
});

/* --- Start server --- */
const server: Server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (NODE_ENV=${NODE_ENV})`);
});

/* Graceful shutdown */
async function shutdown(signal: string) {
  console.log(`Received ${signal}. Closing server and DB pool...`);
  try {
    server.close(() => {
      console.log("HTTP server closed.");
    });
    await pool.end();
    console.log("Postgres pool closed.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
