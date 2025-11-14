import React, { useState } from "react";
import * as styles from "./SubmitBar.module.css";

export default function SubmitBar({ onSubmit }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("image");
  const [status, setStatus] = useState("idle"); // idle, success, error
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setPending(true);
    const ok = await onSubmit(trimmed, kind);
    setPending(false);
    if (ok) {
      setStatus("success");
      setMessage("Thanks! We'll review it shortly.");
      setName("");
    } else {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.copy}>
        Want to see a format supported? Submit it for review and our admins will
        take a look.
      </div>
      <div className={styles.form}>
        <input
          className={styles.input}
          placeholder="Format name e.g., 'Dolby Vision'"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className={styles.select}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="image">image</option>
          <option value="video">video</option>
          <option value="audio">audio</option>
        </select>
        <button
          className={styles.btn}
          type="button"
          onClick={handleSubmit}
          disabled={pending || !name.trim()}
        >
          {pending ? "Submitting…" : "Submit for review"}
        </button>
      </div>
      {message && (
        <div
          className={`${styles.message} ${
            status === "success" ? styles.success : styles.error
          }`}
          role="status"
        >
          {message}
        </div>
      )}
    </div>
  );
}
