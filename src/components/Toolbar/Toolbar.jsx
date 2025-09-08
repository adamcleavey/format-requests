import React from "react";
import styles from "./Toolbar.module.css";

export default function Toolbar({ query, kind, status, sort, onChange }) {
  return (
    <div className={styles.bar}>
      <input
        type="search"
        placeholder="Search formats (e.g., AV1, WebM, FLAC, HEIF)"
        className={styles.input}
        value={query}
        onChange={(e) => onChange({ query: e.target.value })}
      />
      <select
        className={styles.select}
        value={kind}
        onChange={(e) => onChange({ kind: e.target.value })}
      >
        <option value="">All types</option>
        <option>audio</option>
        <option>video</option>
        <option>image</option>
      </select>
      <select
        className={styles.select}
        value={status}
        onChange={(e) => onChange({ status: e.target.value })}
      >
        <option value="">All statuses</option>
        <option>Requested</option>
        <option>Planned</option>
        <option>Supported</option>
      </select>
      <select
        className={styles.select}
        value={sort}
        onChange={(e) => onChange({ sort: e.target.value })}
      >
        <option value="votes-desc">Sort: Votes ↓</option>
        <option value="votes-asc">Sort: Votes ↑</option>
        <option value="name-asc">Sort: Name A→Z</option>
        <option value="name-desc">Sort: Name Z→A</option>
        <option value="newest">Sort: Newest</option>
      </select>
    </div>
  );
}
