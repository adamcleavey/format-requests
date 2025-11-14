import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import Header from "./components/Header/Header.jsx";
import Toolbar from "./components/Toolbar/Toolbar.jsx";
import AdminBar from "./components/AdminBar/AdminBar.jsx";
import SubmitBar from "./components/SubmitBar/SubmitBar.jsx";
import FormatCard from "./components/FormatCard/FormatCard.jsx";
import * as style from "./App.module.css";
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
  | { type: "voteUpdate"; id: string; votes: number }
  | { type: "setRows"; rows: Row[]; votes: string[] };

// --- Configs ---
const USE_API = true; // flip when wiring a backend
// API base — hardcode dev and production origins
const API_BASE =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:3000"
    : "https://format-requests.onrender.com";
const ADMIN_KEY = "change-me";
const ADMIN_STORAGE_KEY = "adminToken";

const getStoredAdminKey = (): string => {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(ADMIN_STORAGE_KEY) || "";
};

const setStoredAdminKey = (value: string | null) => {
  if (typeof window === "undefined") return;
  if (value) sessionStorage.setItem(ADMIN_STORAGE_KEY, value);
  else sessionStorage.removeItem(ADMIN_STORAGE_KEY);
};

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
    case "voteUpdate": {
      const rows = state.rows.map((r) =>
        r.id === action.id ? { ...r, votes: action.votes } : r,
      );
      saveLocalRows(rows);
      return { ...state, rows };
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
  const [reflowPending, setReflowPending] = useState(false);
  const reflowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOrderRef = useRef<string[]>([]);
  const css = style as Record<string, string>;

  const scheduleReflow = useCallback(() => {
    setReflowPending(true);
    if (reflowTimerRef.current) {
      clearTimeout(reflowTimerRef.current);
    }
    reflowTimerRef.current = setTimeout(() => {
      reflowTimerRef.current = null;
      setReflowPending(false);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (reflowTimerRef.current) {
        clearTimeout(reflowTimerRef.current);
      }
    };
  }, []);

  const fetchFormats = useCallback(
    async (adminKey?: string) => {
      if (!USE_API) return;
      try {
        const headers: HeadersInit = {};
        if (adminKey) headers["x-admin-key"] = adminKey;
        const [rowsRes, votesRes] = await Promise.all([
          fetch(`${API_BASE}/api/formats`, { headers }),
          fetch(`${API_BASE}/api/votes/${deviceId}`),
        ]);
        if (!rowsRes.ok) {
          console.warn("Failed to fetch formats from API:", rowsRes.status);
          return;
        }
        const rows = await rowsRes.json();
        let votes: string[] = [];
        if (votesRes.ok) {
          votes = await votesRes.json();
        } else {
          votes = Array.from(getVotesSet());
        }
        const votesSet = new Set(votes);
        dispatch({ type: "setRows", rows, votes: Array.from(votesSet) });
      } catch (err) {
        console.error("Error fetching formats:", err);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (!USE_API) return;
    const storedKey = getStoredAdminKey();
    void fetchFormats(storedKey || undefined);
  }, [fetchFormats]);

  useEffect(() => {
    if (!USE_API) return;
    const es = new EventSource(`${API_BASE}/api/live`);
    es.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (
          data &&
          typeof data.id === "string" &&
          typeof data.votes === "number"
        ) {
          dispatch({ type: "voteUpdate", id: data.id, votes: data.votes });
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };
    return () => es.close();
  }, []);

  const onAdminActivate = useCallback(
    async (key: string) => {
      if (!USE_API) {
        const ok = key === ADMIN_KEY;
        if (ok) setStoredAdminKey(key);
        else setStoredAdminKey(null);
        dispatch({ type: "toggleAdmin", value: ok });
        return;
      }

      const trimmed = key.trim();
      if (!trimmed) {
        setStoredAdminKey(null);
        dispatch({ type: "toggleAdmin", value: false });
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/admin/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminKey: trimmed }),
        });
        if (res.ok) {
          setStoredAdminKey(trimmed);
          dispatch({ type: "toggleAdmin", value: true });
          await fetchFormats(trimmed);
        } else {
          setStoredAdminKey(null);
          dispatch({ type: "toggleAdmin", value: false });
        }
      } catch (err) {
        console.error("Error verifying admin key:", err);
        setStoredAdminKey(null);
        dispatch({ type: "toggleAdmin", value: false });
      }
    },
    [dispatch, fetchFormats],
  );

  useEffect(() => {
    if (!USE_API) return;
    const storedKey = getStoredAdminKey();
    if (storedKey) {
      void onAdminActivate(storedKey);
    }
  }, [onAdminActivate]);

  const filtered = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    const filteredRows: Row[] = state.rows.filter(
      (r) =>
        (state.admin || r.status !== "In Review") &&
        (!q || r.name.toLowerCase().includes(q)) &&
        (!state.kind || r.kind === state.kind) &&
        (!state.status || r.status === state.status),
    );

    const sortKey = state.sort;
    const sortedRows: Row[] = [...filteredRows];
    const applySort = () => {
      switch (sortKey) {
        case "votes-desc":
          sortedRows.sort((a, b) => Number(b.votes) - Number(a.votes));
          break;
        case "votes-asc":
          sortedRows.sort((a, b) => Number(a.votes) - Number(b.votes));
          break;
        case "name-asc":
          sortedRows.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "name-desc":
          sortedRows.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case "newest":
          sortedRows.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
          break;
        default:
          break;
      }
    };

    const isVotesSort = sortKey === "votes-desc" || sortKey === "votes-asc";
    if (isVotesSort && reflowPending) {
      if (!lastOrderRef.current.length) {
        applySort();
        lastOrderRef.current = sortedRows.map((r) => r.id);
        return sortedRows;
      }

      const orderMap = new Map<string, number>();
      lastOrderRef.current.forEach((id, index) => {
        orderMap.set(id, index);
      });

      sortedRows.sort((a, b) => {
        const idxA = orderMap.get(a.id);
        const idxB = orderMap.get(b.id);
        if (idxA === undefined && idxB === undefined) return 0;
        if (idxA === undefined) return 1;
        if (idxB === undefined) return -1;
        return idxA - idxB;
      });
      return sortedRows;
    }

    applySort();
    lastOrderRef.current = sortedRows.map((r) => r.id);
    return sortedRows;
  }, [state, reflowPending]);

  const onVote = async (id: string) => {
    const target = state.rows.find((r) => r.id === id);
    if (!target || target.status !== "Requested") return; // block votes on Planned/Supported

    if (USE_API) {
      try {
        const isCurrentlyVoted = state.votes.has(id);
        const method = "POST";
        const res = await fetch(`${API_BASE}/api/formats/${id}/vote`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
        if (!res.ok) {
          console.warn("Failed to update vote via API:", res.status);
          return;
        }
        const body = await res.json();

        // Determine updated vote count and whether the device has voted
        let updatedRows: Row[] = state.rows;
        if (typeof body.votes === "number") {
          updatedRows = state.rows.map((r) =>
            r.id === id ? { ...r, votes: body.votes } : r,
          );
        } else if (body && body.id) {
          updatedRows = state.rows.map((r) => (r.id === id ? body : r));
        }

        const voted =
          typeof body.voted === "boolean" ? body.voted : !isCurrentlyVoted;
        const votesSet = new Set(state.votes);
        if (voted) votesSet.add(id);
        else votesSet.delete(id);

        // Persist and update state
        saveLocalRows(updatedRows);
        setVotesSet(votesSet);
        dispatch({
          type: "setRows",
          rows: updatedRows,
          votes: Array.from(votesSet),
        });
        scheduleReflow();
      } catch (err) {
        console.error("Error updating vote:", err);
      }
      return;
    }

    // Offline/local-only flow
    dispatch({ type: "voteToggle", id });
    scheduleReflow();
  };

  const onSubmitFormat = async (name: string, kind: string) => {
    if (USE_API) {
      try {
        const res = await fetch(`${API_BASE}/api/formats/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            kind,
          }),
        });
        if (!res.ok) {
          console.warn("Failed to submit format for review:", res.status);
          return false;
        }
        return true;
      } catch (err) {
        console.error("Error submitting format:", err);
        return false;
      }
    }
    const row: Row = {
      id: crypto.randomUUID(),
      name: name.trim(),
      kind,
      status: "In Review",
      created_at: new Date().toISOString(),
      votes: 0,
    };
    dispatch({ type: "addRow", row });
    return true;
  };

  const onAdd = async (name: string, kind: string, status: string) => {
    if (USE_API) {
      try {
        const adminKey = getStoredAdminKey();
        if (!adminKey) {
          console.warn("Cannot add format: missing admin key");
          return;
        }
        const res = await fetch(`${API_BASE}/api/formats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            kind,
            status,
            adminKey,
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
        const adminKey = getStoredAdminKey();
        if (!adminKey) {
          console.warn("Cannot update status: missing admin key");
          return;
        }
        const res = await fetch(`${API_BASE}/api/formats/${id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, adminKey }),
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
        const adminKey = getStoredAdminKey();
        if (!adminKey) {
          console.warn("Cannot delete format: missing admin key");
          return;
        }
        const res = await fetch(`${API_BASE}/api/formats/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminKey }),
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
    <div className={css.app}>
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
        admin={state.admin}
        onChange={(
          payload: Partial<Pick<State, "query" | "kind" | "status" | "sort">>,
        ) => dispatch({ type: "setFilter", payload })}
      />
      <AdminBar visible={state.admin} onAdd={onAdd} />
      <main className={css.gridWrap}>
        <div className={css.grid}>
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
      <SubmitBar onSubmit={onSubmitFormat} />
    </div>
  );
}
