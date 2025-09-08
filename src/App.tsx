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
  | { type: "voteToggle"; id: string };

// --- Configs ---
const USE_API = false; // flip when wiring a backend
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
    status: "",
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
    // placeholder for backend fetch when USE_API = true
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

  const onAdd = (name: string, kind: string, status: string) => {
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

  const onSaveStatus = (id: string, status: string) =>
    dispatch({ type: "updateStatus", id, status });
  const onDelete = (id: string) => dispatch({ type: "deleteRow", id });

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
        <p className={styles.footer}>
          Local-first MVP. Flip <code>USE_API=true</code> in{" "}
          <code>App.jsx</code> to integrate your backend.
        </p>
      </main>
    </div>
  );
}
