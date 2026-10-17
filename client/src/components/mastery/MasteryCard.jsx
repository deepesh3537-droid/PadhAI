import React, { useState, useEffect } from "react";
import { api } from "../../lib/apiClient.js";

/**
 * Component displaying learner topic mastery breakdown, evidence bands,
 * uncertainty wording, and prioritized revision recommendations.
 * (PRD §6 F6/F7, DESIGN §3.8, TASK-061, TASK-062, TEST_PLAN §7).
 */
export function MasteryCard({ courseId, onNavigateToLesson }) {
  const [masteryList, setMasteryList] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadMasteryData = () => {
    if (!courseId) return;
    setLoading(true);
    setErrorMsg("");

    Promise.all([
      api.get(`/courses/${courseId}/mastery`).catch(() => ({ mastery: [] })),
      api.get(`/courses/${courseId}/revisions`).catch(() => ({ recommendations: [] }))
    ])
      .then(([masteryRes, revisionsRes]) => {
        setMasteryList(masteryRes.mastery || []);
        setRecommendations(revisionsRes.recommendations || []);
      })
      .catch((err) => {
        setErrorMsg(err.message || "Failed to load mastery data");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMasteryData();
  }, [courseId]);

  if (loading) {
    return (
      <div className="card" style={{ padding: "28px", textAlign: "center" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            border: "3px solid #E2E8F0",
            borderTopColor: "var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px auto"
          }}
        />
        <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>
          Evaluating your topic mastery and revision schedule...
        </p>
      </div>
    );
  }

  const getTierBadge = (tier, confidence) => {
    if (confidence === "low" || tier === "assessing") {
      return (
        <span
          className="badge"
          style={{ backgroundColor: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1" }}
        >
          Assessing
        </span>
      );
    }
    if (tier === "proficient") {
      return <span className="badge badge-success">Proficient</span>;
    }
    if (tier === "developing") {
      return (
        <span
          className="badge badge-warning"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          Developing
        </span>
      );
    }
    return (
      <span
        className="badge"
        style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5" }}
      >
        Practice Suggested
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Revision Recommendations Section (TASK-062) */}
      {recommendations.length > 0 && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid var(--color-warning)",
            backgroundColor: "#FFFDF5",
            padding: "20px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "18px" }}>💡</span>
            <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#92400E", margin: 0 }}>
              Recommended Revisions ({recommendations.length})
            </h3>
          </div>
          <p style={{ fontSize: "13px", color: "#78350F", marginBottom: "16px" }}>
            Based on your quiz attempts and spaced repetition decay, revising these topics now will
            maximize retention:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  padding: "14px 16px",
                  backgroundColor: "#FFFFFF",
                  borderRadius: "8px",
                  border: "1px solid #FDE68A",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px"
                }}
              >
                <div style={{ flex: 1, minWidth: "240px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "14px", color: "var(--color-text)" }}>
                      {rec.topic}
                    </strong>
                    <span
                      className="badge"
                      style={{
                        fontSize: "11px",
                        backgroundColor: rec.priority === "high" ? "#FEE2E2" : "#FEF3C7",
                        color: rec.priority === "high" ? "#991B1B" : "#92400E"
                      }}
                    >
                      {rec.priority === "high" ? "High Priority" : "Suggested Refresh"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: 1.5 }}>
                    {rec.reason}
                  </p>
                </div>

                {onNavigateToLesson && (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: "12px", padding: "6px 12px", whiteSpace: "nowrap" }}
                    onClick={() => onNavigateToLesson(rec.topic)}
                  >
                    Practice Topic →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic Mastery Breakdown (TASK-061, TEST_PLAN §7) */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <h3 style={{ fontSize: "18px", margin: 0 }}>Topic Mastery Profile</h3>
            <p style={{ fontSize: "13px", color: "var(--color-muted)", marginTop: "4px" }}>
              Scores are calculated mathematically using recency-weighted exponential decay. Single wrong
              answers are never marked as weak.
            </p>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: "12px", padding: "4px 8px" }}
            onClick={loadMasteryData}
          >
            Refresh ⟳
          </button>
        </div>

        {errorMsg && <div className="error-banner" style={{ marginBottom: "16px" }}>{errorMsg}</div>}

        {masteryList.length === 0 ? (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              backgroundColor: "#F8FAFC",
              borderRadius: "8px",
              border: "1px dashed var(--color-border)"
            }}
          >
            <p style={{ fontSize: "14px", color: "var(--color-muted)", marginBottom: "6px" }}>
              No quiz evidence recorded for this course yet.
            </p>
            <p style={{ fontSize: "12px", color: "var(--color-muted)" }}>
              Complete the quiz at the end of each lesson to build your verified mastery profile!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {masteryList.map((m) => (
              <div
                key={m.id || m.topic}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "#FFFFFF"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h4 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>{m.topic}</h4>
                    {getTierBadge(m.tier, m.confidence)}
                  </div>

                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>
                    {m.masteryScore}%
                  </div>
                </div>

                {/* Uncertainty Wording (PRD §6 F6 / TEST_PLAN §7) */}
                <div style={{ fontSize: "13px", color: "var(--color-muted)", marginBottom: "10px" }}>
                  {m.wording}
                </div>

                {/* Visual Progress Bar */}
                <div
                  style={{
                    height: "6px",
                    width: "100%",
                    backgroundColor: "#F1F5F9",
                    borderRadius: "3px",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, m.masteryScore))}%`,
                      backgroundColor:
                        m.masteryScore >= 80
                          ? "var(--color-success)"
                          : m.masteryScore >= 55
                          ? "var(--color-warning)"
                          : "var(--color-primary)",
                      borderRadius: "3px",
                      transition: "width 0.3s ease"
                    }}
                  />
                </div>

                {/* Evidence count metadata */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "var(--color-muted)",
                    marginTop: "6px"
                  }}
                >
                  <span>Confidence: {m.confidenceLabel}</span>
                  <span>
                    Evidence: {m.correctCount} / {m.evidenceCount} answers correct
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MasteryCard;
