import React, { useState } from "react";

/**
 * AttemptHistory: Lists historical quiz attempts for the current lesson/quiz,
 * allowing learners to inspect past performance.
 */
export function AttemptHistory({ attempts = [], onSelectAttempt }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!attempts || attempts.length === 0) {
    return null;
  }

  const latestAttempt = attempts[0];

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "16px 20px",
        backgroundColor: "#F8FAFC",
        borderRadius: "var(--radius-btn)",
        border: "1px solid var(--color-border)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer"
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>
            Attempt History
          </span>
          <span className="badge" style={{ backgroundColor: "#E2E8F0", color: "var(--color-muted)", fontSize: "11px" }}>
            {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}
          </span>
          {latestAttempt && (
            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
              Latest: <strong>{latestAttempt.score}%</strong>
            </span>
          )}
        </div>

        <button
          className="btn btn-ghost"
          style={{ padding: "4px 8px", fontSize: "12px", minHeight: "auto" }}
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Hide History ▲" : "View History ▼"}
        </button>
      </div>

      {isExpanded && (
        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {attempts.map((att, idx) => {
            const dateStr = new Date(att.created_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });
            const isPassing = att.score >= 60;

            return (
              <div
                key={att.id || idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  backgroundColor: "#FFFFFF",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                  fontSize: "13px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ color: "var(--color-muted)" }}>#{attempts.length - idx}</span>
                  <span style={{ fontWeight: 500 }}>{dateStr}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: isPassing ? "#DCFCE7" : "#FEE2E2",
                      color: isPassing ? "var(--color-success)" : "var(--color-danger)",
                      fontWeight: 600
                    }}
                  >
                    {att.score}%
                  </span>

                  {onSelectAttempt && (
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "4px 8px", fontSize: "12px", minHeight: "auto" }}
                      onClick={() => onSelectAttempt(att)}
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AttemptHistory;
