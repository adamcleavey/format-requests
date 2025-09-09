/**
 * Minimal Express + pg API for Format Poker
 *
 * - Expects DATABASE_URL env var (Render provides this)
 * - ADMIN_KEY env var for admin operations (simple header check)
 *
 * Endpoints:
 *  - GET    /api/formats                 List formats (filters/sort via query)
 *  - GET    /api/formats/:id             Get one format
 *  - POST   /api/formats                 Create format (admin)
 *  - PUT    /api/formats/:id/status      Update status (admin)
 *  - DELETE /api/formats/:id             Delete format (admin)
 *  - POST   /api/formats/:id/vote        Toggle vote for a device (body: { deviceId })
 *  - GET    /health                      Healthcheck
 *
 * Usage:
 *  - Set DATABASE_URL and ADMIN_KEY in environment.
 *  - Start: node server.js
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-me";

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set. Exiting.");
  process.exit(1);
}

// Configure pg pool, with SSL for production rendered connections
const pool = new Pool({
  connectionString: DATABASE_URL,
  // Render/Postgres on many hosts require SSL; allow opting in via NODE_ENV
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Simple admin check using header `x-admin-key`
function requireAdmin(req, res, next) {
  const key =
    req.get("x-admin-key") ||
    (req.body && req.body.adminKey) ||
    req.query.adminKey;
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return next();
}

// Convenience: numeric safe parse
function parseIntSafe(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// GET /api/formats
// Query params supported:
//   q (text search on name), kind, status, sort (votes-desc, votes-asc, name-asc, name-desc, newest)
app.get("/api/formats", async (req, res) => {
  const { q, kind, status, sort } = req.query;

  // Build SQL dynamically but with parameterized values
  const whereClauses = [];
  const values = [];
  let idx = 1;

  if (q && String(q).trim()) {
    values.push(`%${String(q).trim().toLowerCase()}%`);
    whereClauses.push(`LOWER(name) LIKE $${idx++}`);
  }
  if (kind && String(kind).trim()) {
    values.push(String(kind).trim());
    whereClauses.push(`kind = $${idx++}`);
  }
  if (status && String(status).trim()) {
    values.push(String(status).trim());
    whereClauses.push(`status = $${idx++}`);
  }

  let whereSql = "";
  if (whereClauses.length > 0) {
    whereSql = "WHERE " + whereClauses.join(" AND ");
  }

  let orderSql = "ORDER BY votes DESC, created_at DESC";
  switch (String(sort || "").toLowerCase()) {
    case "votes-asc":
    case "votes-ascending":
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
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/formats error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// GET /api/formats/:id
app.get("/api/formats/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const { rows } = await pool.query(
      "SELECT id, name, kind, status, created_at, votes FROM formats WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/formats/:id error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// POST /api/formats (admin)
app.post("/api/formats", requireAdmin, async (req, res) => {
  const { name, kind, status } = req.body || {};
  if (!name || !kind || !status) {
    return res.status(400).json({ error: "missing_fields" });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO formats (name, kind, status) VALUES ($1, $2, $3) RETURNING id, name, kind, status, created_at, votes",
      [String(name).trim(), String(kind).trim(), String(status).trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/formats error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// PUT /api/formats/:id/status (admin)
app.put("/api/formats/:id/status", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { status } = req.body || {};
  if (!status) {
    return res.status(400).json({ error: "missing_status" });
  }
  try {
    const { rows } = await pool.query(
      "UPDATE formats SET status = $1 WHERE id = $2 RETURNING id, name, kind, status, created_at, votes",
      [String(status).trim(), id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/formats/:id/status error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// DELETE /api/formats/:id (admin)
app.delete("/api/formats/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query("DELETE FROM votes WHERE format_id = $1", [id]);
    const result = await pool.query("DELETE FROM formats WHERE id = $1", [id]);
    // result.rowCount may not be supported on all drivers; we can re-check
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/formats/:id error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// GET /api/votes/:deviceId
// Returns an array of format IDs this device has voted for.
app.get("/api/votes/:deviceId", async (req, res) => {
  const deviceId = req.params.deviceId;
  if (!deviceId) return res.status(400).json({ error: "missing_deviceId" });
  try {
    const { rows } = await pool.query(
      "SELECT format_id FROM votes WHERE device_id = $1",
      [deviceId]
    );
    res.json(rows.map((r) => r.format_id));
  } catch (err) {
    console.error("GET /api/votes/:deviceId error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// POST /api/formats/:id/vote
// body: { deviceId: "<uuid-or-string>" }
// Toggles vote: if not voted, insert and increment, else remove and decrement.
app.post("/api/formats/:id/vote", async (req, res) => {
  const id = req.params.id;
  const deviceId = req.body && req.body.deviceId;
  if (!deviceId) return res.status(400).json({ error: "missing_deviceId" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existsRes = await client.query(
      "SELECT 1 FROM votes WHERE device_id = $1 AND format_id = $2",
      [deviceId, id]
    );

    let voted;
    if (existsRes.rowCount === 0) {
      // insert vote
      await client.query(
        "INSERT INTO votes (device_id, format_id) VALUES ($1, $2)",
        [deviceId, id]
      );
      await client.query(
        "UPDATE formats SET votes = votes + 1 WHERE id = $1",
        [id]
      );
      voted = true;
    } else {
      // remove vote
      await client.query(
        "DELETE FROM votes WHERE device_id = $1 AND format_id = $2",
        [deviceId, id]
      );
      await client.query(
        "UPDATE formats SET votes = GREATEST(votes - 1, 0) WHERE id = $1",
        [id]
      );
      voted = false;
    }

    // read current votes
    const vres = await client.query(
      "SELECT votes FROM formats WHERE id = $1",
      [id]
    );
    await client.query("COMMIT");
    const votes = vres.rows[0] ? Number(vres.rows[0].votes || 0) : 0;
    return res.json({ voted, votes });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/formats/:id/vote error:", err);
    return res.status(500).json({ error: "db_error" });
  } finally {
    client.release();
  }
});

// Healthcheck
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Graceful shutdown
async function shutdown(signal) {
  console.log(`Received ${signal}. Closing HTTP server and DB pool...`);
  try {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`NODE_ENV=${process.env.NODE_ENV || "development"}`);
});
