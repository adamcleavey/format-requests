import React, { useState, useEffect, useRef } from "react";
import * as styles from "./Header.module.css";

export default function Header({ count, adminActive, onAdminActivate }) {
  const [key, setKey] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (adminActive) {
      setShowLogin(false);
      setKey("");
    }
  }, [adminActive]);

  useEffect(() => {
    if (showLogin && !adminActive) {
      inputRef.current?.focus();
    }
  }, [showLogin, adminActive]);

  const toggleLogin = () => {
    setShowLogin((current) => {
      const next = !current;
      if (!next) {
        setKey("");
      }
      return next;
    });
  };

  const triggerActivate = (event) => {
    event.preventDefault();
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      return;
    }
    onAdminActivate(trimmedKey);
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
              <form className={styles.form} onSubmit={triggerActivate}>
                <label className={styles.srOnly} htmlFor="admin-key">
                  Admin access key
                </label>
                <input
                  ref={inputRef}
                  id="admin-key"
                  type="password"
                  className={styles.input}
                  placeholder="enter key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
                <button className={styles.button} type="submit">
                  Activate
                </button>
                <button
                  className={styles.cancel}
                  type="button"
                  onClick={toggleLogin}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                {adminActive && (
                  <span className={styles.status} role="status" aria-live="polite">
                    Admin mode active
                  </span>
                )}
                <button
                  className={styles.gear}
                  onClick={toggleLogin}
                  aria-label={
                    adminActive ? "Hide admin login" : "Show admin login"
                  }
                  aria-pressed={showLogin}
                >
                  ⚙
                </button>
              </>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
