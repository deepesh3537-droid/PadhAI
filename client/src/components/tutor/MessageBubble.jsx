import React from "react";

/**
 * MessageBubble rendering individual conversation entries with source chips
 * and beyond-course material banners.
 * (PRD §6 F8, DESIGN §3.7, TASK-065).
 */
export function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const isBeyondCourse = Boolean(message.beyond_course);
  const sources = message.sources || [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: "14px"
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "12px 16px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          backgroundColor: isUser ? "var(--color-primary-strong)" : "#FFFFFF",
          color: isUser ? "#FFFFFF" : "var(--color-text)",
          boxShadow: isUser ? "0 2px 8px rgba(79, 70, 229, 0.2)" : "0 1px 3px rgba(0,0,0,0.07)",
          border: isUser ? "none" : "1px solid var(--color-border)",
          fontSize: "14px",
          lineHeight: 1.6,
          wordBreak: "break-word"
        }}
      >
        {/* Beyond course materials banner (DESIGN §3.7, ADR-011) */}
        {!isUser && isBeyondCourse && (
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "#E0F2FE",
              color: "#0369A1",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px"
            }}
          >
            <span>ℹ️</span> Beyond your course materials
          </div>
        )}

        {/* Message content */}
        <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>

        {/* Source chips (DESIGN §3.7) */}
        {!isUser && sources.length > 0 && (
          <div
            style={{
              marginTop: "10px",
              paddingTop: "8px",
              borderTop: "1px solid #F1F5F9",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--color-muted)", fontWeight: 500 }}>
              Sources:
            </span>
            {sources.map((src, idx) => (
              src.url ? (
                <a
                  key={idx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge"
                  style={{
                    fontSize: "11px",
                    backgroundColor: "#EEF2FF",
                    color: "var(--color-primary-strong)",
                    textDecoration: "none",
                    border: "1px solid #C7D2FE",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  🔗 {src.title || "External Resource"}
                </a>
              ) : (
                <span
                  key={idx}
                  className="badge"
                  style={{
                    fontSize: "11px",
                    backgroundColor: "#F1F5F9",
                    color: "#475569",
                    border: "1px solid #E2E8F0"
                  }}
                >
                  📖 {src.title || "Lesson Material"}
                </span>
              )
            ))}
          </div>
        )}
      </div>

      <span
        style={{
          fontSize: "10px",
          color: "var(--color-muted)",
          marginTop: "4px",
          paddingLeft: "4px",
          paddingRight: "4px"
        }}
      >
        {isUser ? "You" : "PadhAI Tutor"}
        {message.created_at && (
          <> · {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
        )}
      </span>
    </div>
  );
}

export default MessageBubble;
