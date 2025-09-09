import React, { useState, useEffect } from "react";
import * as styles from "./Header.module.css";

export default function Header({ count, adminActive, onAdminActivate }) {
  const [key, setKey] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (adminActive) {
      setShowLogin(false);
      setKey("");
    }
  }, [adminActive]);

  const triggerActivate = () => {
    onAdminActivate(key);
  };

  return (
    <header className={styles.header}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>Format Requests</h1>
        <div className={styles.row}>
          <span className={styles.chip}>{count} formats</span>
          <span className={styles.chip}>
            Click to upvote. One vote per format per device.
          </span>
          <span className={styles.admin}>
            {showLogin && !adminActive ? (
              <>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="enter key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
                <button className={styles.button} onClick={triggerActivate}>
                  Activate
                </button>
              </>
            ) : (
              <button
                className={styles.gear}
                onClick={() => setShowLogin((v) => !v)}
                aria-label="Admin login"
              >
                ⚙
              </button>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
