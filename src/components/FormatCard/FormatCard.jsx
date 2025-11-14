import React, { useState } from "react";
import * as styles from "./FormatCard.module.css";

const statusClass = (s) =>
  ({
    Supported: styles.supported,
    Planned: styles.planned,
    Requested: styles.requested,
    "In Review": styles.review,
  })[s] || styles.requested;

export default function FormatCard({
  row,
  voted,
  admin,
  onVote,
  onSaveStatus,
  onDelete,
}) {
  const [edit, setEdit] = useState(row.status);
  const isRequestable = row.status === "Requested";
  return (
    <div className={styles.card}>
      <div className={styles.title}>
        <div>
          <div className={styles.name}>{row.name}</div>
          <div className={styles.meta}>{row.kind}</div>
        </div>
        <div
          className={`${styles.status} ${statusClass(row.status)}`}
          data-s={row.status}
        >
          {row.status}
        </div>
      </div>

      <div className={styles.actions}>
        {isRequestable ? (
          <button
            className={`${styles.vote} ${voted ? styles.voted : ""}`}
            aria-pressed={voted ? "true" : "false"}
            title="Upvote this format"
            onClick={onVote}
          >
            <span>▲</span>
            <span className={styles.count}>{row.votes ?? 0}</span>
          </button>
        ) : (
          ""
        )}

        <span className={styles.pill}>{row.kind}</span>

        {admin && (
          <div className={styles.admin}>
            <select
              className={styles.select}
              value={edit}
              onChange={(e) => setEdit(e.target.value)}
            >
              <option>Requested</option>
              <option>Planned</option>
              <option>Supported</option>
              <option>In Review</option>
            </select>
            <button className={styles.btn} onClick={() => onSaveStatus(edit)}>
              Save
            </button>
            <button
              className={`${styles.btn} ${styles.danger}`}
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
