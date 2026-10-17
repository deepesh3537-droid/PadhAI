import React, { useState, useEffect, useRef } from "react";
import { api } from "../../lib/apiClient.js";
import { MessageBubble } from "./MessageBubble.jsx";

/**
 * AI Tutor Panel component with lesson grounding, persisted chat history,
 * source chips, quick action buttons, and quota handling.
 * (PRD §6 F8, DESIGN §3.7, TASK-065, TEST_PLAN §8).
 */
export function TutorPanel({ lessonId, lessonTitle }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load previous persisted conversation history from DB (PRD §6 F8)
  useEffect(() => {
    if (!lessonId) return;

    let isCancelled = false;
    setHistoryLoading(true);
    setErrorMsg("");

    api.get(`/lessons/${lessonId}/tutor`)
      .then((data) => {
        if (!isCancelled) {
          setMessages(data.messages || []);
        }
      })
      .catch((err) => {
        console.warn("Failed to load tutor history:", err);
      })
      .finally(() => {
        if (!isCancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query || !lessonId || loading) return;

    setInputText("");
    setErrorMsg("");

    // Optimistically append user message
    const tempUserMsg = {
      id: "temp-" + Date.now(),
      role: "user",
      content: query,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.post("/tutor/messages", {
        lessonId,
        message: query
      });

      if (res?.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err) {
      // Friendly message for quota/rate limit exhaustion (DESIGN §3.7 / TEST_PLAN §8)
      if (err.status === 429 || err.code === "AI_RATE_LIMIT_EXCEEDED") {
        setErrorMsg("AI tutor question limit reached for now. Please wait a moment before asking again.");
      } else {
        setErrorMsg(err.message || "Could not reach the AI tutor. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { label: "Explain simpler", query: `Can you explain the main concept of "${lessonTitle}" in simpler terms with an everyday analogy?` },
    { label: "Give an example", query: `Could you give a concrete, real-world example illustrating the concepts in "${lessonTitle}"?` },
    { label: "Quiz me", query: `Can you ask me a conceptual question about "${lessonTitle}" to test my understanding?` },
    { label: "Key takeaways", query: `What are the 3 most important takeaways from "${lessonTitle}"?` }
  ];

  return (
    <div
      className="card tutor-panel-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "600px",
        padding: "0",
        overflow: "hidden",
        border: "1px solid var(--color-border)",
        backgroundColor: "#FAFAFA"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>🤖</span>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>PadhAI Tutor</h3>
            <p style={{ fontSize: "12px", color: "var(--color-muted)", margin: 0 }}>
              Course-grounded AI assistant
            </p>
          </div>
        </div>
        <span
          className="badge"
          style={{
            fontSize: "11px",
            backgroundColor: "#EEF2FF",
            color: "var(--color-primary-strong)",
            border: "1px solid #C7D2FE"
          }}
        >
          ● Active
        </span>
      </div>

      {/* Message Stream */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {historyLoading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--color-muted)", fontSize: "13px" }}>
            Loading previous conversation...
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              margin: "auto 0",
              color: "var(--color-muted)"
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>👋</div>
            <h4 style={{ fontSize: "15px", color: "var(--color-text)", marginBottom: "6px" }}>
              Have questions about this lesson?
            </h4>
            <p style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "16px" }}>
              I'm your AI tutor for <strong>"{lessonTitle}"</strong>. I cite your course materials and clarify
              difficult topics.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => <MessageBubble key={msg.id || idx} message={msg} />)
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid #E2E8F0",
                borderTopColor: "var(--color-primary)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
              }}
            />
            <span style={{ fontSize: "13px", color: "var(--color-muted)" }}>
              PadhAI Tutor is formulating an answer...
            </span>
          </div>
        )}

        {errorMsg && (
          <div
            className="error-banner"
            style={{
              fontSize: "13px",
              padding: "10px 14px",
              marginBottom: "12px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B"
            }}
          >
            {errorMsg}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions (DESIGN §3.7) */}
      <div
        style={{
          padding: "8px 14px",
          backgroundColor: "#FFFFFF",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          whiteSpace: "nowrap"
        }}
      >
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            className="btn btn-ghost"
            style={{
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "14px",
              backgroundColor: "#F1F5F9",
              color: "#334155",
              border: "1px solid #E2E8F0",
              flexShrink: 0
            }}
            onClick={() => handleSendMessage(action.query)}
            disabled={loading}
          >
            ✨ {action.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div
        style={{
          padding: "12px 14px",
          backgroundColor: "#FFFFFF",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          gap: "8px",
          alignItems: "center"
        }}
      >
        <input
          type="text"
          className="form-input"
          placeholder="Ask a question about this lesson..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            fontSize: "14px",
            borderRadius: "var(--radius-btn)"
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => handleSendMessage()}
          disabled={loading || !inputText.trim()}
          style={{ padding: "10px 16px", fontSize: "14px", whiteSpace: "nowrap" }}
        >
          {loading ? "Thinking..." : "Send ↑"}
        </button>
      </div>
    </div>
  );
}

export default TutorPanel;
