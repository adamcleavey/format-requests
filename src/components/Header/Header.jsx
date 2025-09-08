import React, { useState } from "react";
import styles from "./Header.module.css";

export default function Header({ count, adminActive, onAdminActivate }) {
  const [key, setKey] = useState("");
  return (
    <header className={styles.header}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>Format Requests</h1>
        <div className={styles.row}>
          <span className={styles.chip}>{count} formats</span>
          <span className={styles.chip}>
            Click to upvote. One vote per device.
          </span>
          <span className={styles.admin}>
            Admin mode:
            <input
              type="password"
              className={styles.input}
              placeholder="enter key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button
              className={styles.button}
              onClick={() => onAdminActivate(key)}
            >
              {adminActive ? "Active" : "Activate"}
            </button>
          </span>
        </div>
      </div>
    </header>
  );
}
