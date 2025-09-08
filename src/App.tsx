import React, { useEffect, useMemo, useReducer } from "react";
import Header from "./components/Header/Header.jsx";
import Toolbar from "./components/Toolbar/Toolbar.jsx";
import AdminBar from "./components/AdminBar/AdminBar.jsx";
import FormatCard from "./components/FormatCard/FormatCard.jsx";
import styles from "./App.module.css";
import { seed } from "./data/seed";
import {
  loadLocalRows,
  saveLocalRows,
  getVotesSet,
  setVotesSet,
  deviceId,
} from "./data/local.js";

// --- Types for App state and actions ---
type Row = {
  id: string;
  name: string;
  kind: string;
  status: string;
  created_at: string;
  votes: number;
};

type State = {
  admin: boolean;
  rows: Row[];
  votes: Set<string>;
  query: string;
  kind: string;
  status: string;
  sort: string;
};

type Action =
  | {
      type: "setFilter";
      payload: Partial<Pick<State, "query" | "kind" | "status" | "sort">>;
    }
  | { type: "toggleAdmin"; value: boolean }
  | { type: "addRow"; row: Row }
  | { type: "updateStatus"; id: string; status: string }
  | { type: "deleteRow"; id: string }
  | { type: "voteToggle"; id: string }
  | { type: "setRows"; rows: Row[]; votes: string[] };

// --- Configs ---
const USE_API = true; // flip when wiring a backend
// API base — prefer an environment-provided value, fall back to localhost in dev.
// Avoid referencing `process` directly in client runtime code; instead, prefer
// values exposed on `window` or via `import.meta.env` (Vite / modern bundlers).
// The .replace ensures there is no trailing slash when building URLs.
const API_BASE =
  // First prefer an explicit global set by the hosting environment / HTML
  (
    (typeof window !== "undefined" && (window as any).__API_URL__) ||
    // Next, prefer build-time envs exposed via import.meta.env (Vite, Snowpack, etc.)
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env &&
      (import.meta as any).env.RENDER_EXTERNAL_URL) ||
    // Finally, fall back to localhost for local dev
    "http://localhost:3000"
  ).replace(/\/$/, "");
const ADMIN_KEY = "change-me";

const init = (): State => {
  const rows = loadLocalRows(seed);
  const votes = getVotesSet();
  return {
    admin: false,
    rows,
    votes,
    query: "",
    kind: "",
    status: "Requested",
    sort: "votes-desc",
  };
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setFilter":
      return { ...state, ...action.payload };
    case "toggleAdmin":
      return { ...state, admin: action.value };
    case "addRow": {
      const rows = [...state.rows, action.row];
      saveLocalRows(rows);
      return { ...state, rows };
    }
    case "updateStatus": {
      const rows = state.rows.map((r) =>
        r.id === action.id ? { ...r, status: action.status } : r,
      );
      saveLocalRows(rows);
      return { ...state, rows };
    }
    case "deleteRow": {
      const rows = state.rows.filter((r) => r.id !== action.id);
      saveLocalRows(rows);
      const votes = new Set([...state.votes]);
      votes.delete(action.id);
      setVotesSet(votes);
      return { ...state, rows, votes };
    }
    case "voteToggle": {
      const rows = state.rows.map((r) =>
        r.id === action.id
          ? { ...r, votes: r.votes + (state.votes.has(action.id) ? -1 : 1) }
          : r,
      );
      const votes = new Set(state.votes);
      if (votes.has(action.id)) votes.delete(action.id);
      else votes.add(action.id);
      saveLocalRows(rows);
      setVotesSet(votes);
      return { ...state, rows, votes };
    }
    case "setRows": {
      // Replace rows and votes (votes array contains format ids the current device has voted for)
      const votesSet = new Set(action.votes || []);
      // Save the rows locally so offline usage still works
      saveLocalRows(action.rows);
      setVotesSet(votesSet);
      return { ...state, rows: action.rows, votes: votesSet };
    }
    default:
      return state;
  }
}

export default function App() {
  const reducerFn = reducer as React.Reducer<State, Action>;
  const [state, dispatch]: [State, React.Dispatch<Action>] = useReducer(
    reducerFn,
    undefined,
    init,
  );

  useEffect(() => {
    // If using API, fetch authoritative rows from the server on mount.
    // We still preserve local vote state (device votes) using local.js utilities.
    if (!USE_API) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/formats`);
        if (!res.ok) {
          console.warn("Failed to fetch formats from API:", res.status);
          return;
        }
        const rows = await res.json();
        // Keep local voted set (device-scoped) to determine if this device has voted
        const votesSet = getVotesSet();
        // Dispatch to replace rows and votes
        dispatch({ type: "setRows", rows, votes: Array.from(votesSet) });
      } catch (err) {
        console.error("Error fetching formats:", err);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    let list: Row[] = state.rows.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q)) &&
        (!state.kind || r.kind === state.kind) &&
        (!state.status || r.status === state.status),
    );
    switch (state.sort) {
      case "votes-desc":
        list.sort((a, b) => Number(b.votes) - Number(a.votes));
        break;
      case "votes-asc":
        list.sort((a, b) => Number(a.votes) - Number(b.votes));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      default:
        break;
    }
    return list;
  }, [state]);

  const onVote = async (id: string) => {
    const target = state.rows.find((r) => r.id === id);
    if (!target || target.status !== "Requested") return; // block votes on Planned/Supported
    if (USE_API) {
      // POST/DELETE /api/formats/:id/vote {deviceId} -> {votes}
    }
    dispatch({ type: "voteToggle", id });
  };

  const onAdminActivate = (key: string) => {
    const ok = USE_API
      ? Boolean(sessionStorage.getItem("adminToken"))
      : key === ADMIN_KEY;
    if (!ok && USE_API && key) sessionStorage.setItem("adminToken", key);
    const nowOk = USE_API
      ? Boolean(sessionStorage.getItem("adminToken"))
      : key === ADMIN_KEY;
    dispatch({ type: "toggleAdmin", value: nowOk });
  };

  const onAdd = async (name: string, kind: string, status: string) => {
    if (USE_API) {
      try {
        const res = await fetch(`${API_BASE}/api/formats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            kind,
            status,
            adminKey: ADMIN_KEY,
          }),
        });
        if (!res.ok) {
          console.warn("Failed to add format via API:", res.status);
          return;
        }
        const row = await res.json();
        // Append returned row to local state (and persist locally)
        dispatch({ type: "addRow", row });
      } catch (err) {
        console.error("Error adding format:", err);
      }
      return;
    }
    const row: Row = {
      id: crypto.randomUUID(),
      name: name.trim(),
      kind,
      status,
      created_at: new Date().toISOString(),
      votes: 0,
    };
    dispatch({ type: "addRow", row });
  };

  const onSaveStatus = async (id: string, status: string) => {
    if (USE_API) {
      try {
        const res = await fetch(`${API_BASE}/api/formats/${id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, adminKey: ADMIN_KEY }),
        });
        if (!res.ok) {
          console.warn("Failed to update status via API:", res.status);
          return;
        }
        const updated = await res.json();
        // Update local rows to reflect updated status and persist
        const rows = state.rows.map((r) => (r.id === id ? updated : r));
        saveLocalRows(rows);
        dispatch({ type: "setRows", rows, votes: Array.from(state.votes) });
      } catch (err) {
        console.error("Error updating status:", err);
      }
      return;
    }
    dispatch({ type: "updateStatus", id, status });
  };
  const onDelete = async (id: string) => {
    if (USE_API) {
      try {
        const res = await fetch(`${API_BASE}/api/formats/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminKey: ADMIN_KEY }),
        });
        if (!res.ok) {
          console.warn("Failed to delete via API:", res.status);
          return;
        }
        // Remove locally
        const rows = state.rows.filter((r) => r.id !== id);
        const votes = new Set([...state.votes]);
        votes.delete(id);
        saveLocalRows(rows);
        setVotesSet(votes);
        dispatch({ type: "setRows", rows, votes: Array.from(votes) });
      } catch (err) {
        console.error("Error deleting format:", err);
      }
      return;
    }
    dispatch({ type: "deleteRow", id });
  };

  return (
    <div className={styles.app}>
      <Header
        count={filtered.length}
        adminActive={state.admin}
        onAdminActivate={onAdminActivate}
      />
      <Toolbar
        query={state.query}
        kind={state.kind}
        status={state.status}
        sort={state.sort}
        onChange={(
          payload: Partial<Pick<State, "query" | "kind" | "status" | "sort">>,
        ) => dispatch({ type: "setFilter", payload })}
      />
      <AdminBar visible={state.admin} onAdd={onAdd} />
      <main className={styles.gridWrap}>
        <div className={styles.grid}>
          {filtered.map((r) => (
            <FormatCard
              key={r.id}
              row={r}
              voted={state.votes.has(r.id)}
              admin={state.admin}
              onVote={() => onVote(r.id)}
              onSaveStatus={(s: string) => onSaveStatus(r.id, s)}
              onDelete={() => onDelete(r.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
