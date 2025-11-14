import React, { useState } from "react";
import * as styles from "./AdminBar.module.css";

export default function AdminBar({ visible, onAdd }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("image");
  const [status, setStatus] = useState("Requested");

  if (!visible) return null;

  return (
    <div className={styles.bar}>
      <input
        className={styles.input}
        placeholder="Add format e.g., 'Dolby Vision'"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className={styles.select}
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        <option>image</option>
        <option>video</option>
        <option>audio</option>
      </select>
      <select
        className={styles.select}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option>Requested</option>
        <option>Planned</option>
        <option>Supported</option>
        <option>In Review</option>
      </select>
      <button
        className={styles.btn}
        onClick={() => {
          if (name.trim()) {
            onAdd(name, kind, status);
            setName("");
          }
        }}
      >
        Add
      </button>
    </div>
  );
}
