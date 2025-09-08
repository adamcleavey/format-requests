export const deviceId = (() => {
  const k = "device.id";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(k, v);
  }
  return v;
})();

const ROWS_KEY = "formats.v1";
const VOTES_KEY = "votes.v1";

export function loadLocalRows(seedTuples) {
  const current = JSON.parse(localStorage.getItem(ROWS_KEY) || "null");
  if (current) return current;
  const now = new Date().toISOString();
  const rows = seedTuples.map(([name, kind, status]) => ({
    id: crypto.randomUUID(),
    name,
    kind,
    status,
    created_at: now,
    votes: 0,
  }));
  localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
  if (!localStorage.getItem(VOTES_KEY))
    localStorage.setItem(VOTES_KEY, JSON.stringify({}));
  return rows;
}

export function saveLocalRows(rows) {
  localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
}

export function getVotesSet() {
  const map = JSON.parse(localStorage.getItem(VOTES_KEY) || "{}");
  const mine = map[deviceId] || {};
  return new Set(Object.keys(mine));
}

export function setVotesSet(set) {
  const map = JSON.parse(localStorage.getItem(VOTES_KEY) || "{}");
  map[deviceId] = {};
  for (const id of set) map[deviceId][id] = true;
  localStorage.setItem(VOTES_KEY, JSON.stringify(map));
}
