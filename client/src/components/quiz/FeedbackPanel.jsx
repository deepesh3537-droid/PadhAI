import React from "react";

/**
 * FeedbackPanel: Displays the learner's score, per-question correctness,
 * explanations of right answers, and mistake notes after quiz submission.
 * (DESIGN §3.6, TEST_PLAN §6).
 */
export function FeedbackPanel({
  feedback,
  onRetake,
  onRegenerate,
  isRegenerating = false
}) {
  if (!feedback) return null;

  const { score = 0, totalQuestions = 0, correctCount = 0, questionResults = [] } = feedback;
  const isPassing = score >= 60;
  const isMastered = score >= 80;

  return (
    <div
      className="card"
      style={{ padding: "28px", border: "1px solid var(--color-border)" }}
      role="region"
      aria-live="polite"
      aria-label="Quiz Results and Feedback"
    >
      {/* Score Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "24px"
        }}
      >
        <div>
          <div style={{ fontSize: "13px", color: "var(--color-muted)", marginBottom: "4px" }}>
            Assessment Result
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "var(--color-text)" }}>
              {score}%
            </span>
            <span style={{ fontSize: "15px", color: "var(--color-muted)" }}>
              ({correctCount} of {totalQuestions} correct)
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            className={`badge ${isMastered ? "badge-success" : isPassing ? "badge-warning" : "badge-danger"}`}
            style={{
              fontSize: "13px",
              padding: "6px 14px",
              backgroundColor: isMastered ? "#DCFCE7" : isPassing ? "#FEF3C7" : "#FEE2E2",
              color: isMastered ? "var(--color-success)" : isPassing ? "var(--color-warning)" : "var(--color-danger)"
            }}
          >
            {isMastered
              ? "🌟 Excellent Comprehension"
              : isPassing
              ? "👍 Good Understanding"
              : "📖 Needs Review"}
          </span>
        </div>
      </div>

      {/* Itemized Question Breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "28px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Review Answers & Explanations:</h3>

        {questionResults.map((result, idx) => {
          const isCorrect = result.isCorrect;
          return (
            <div
              key={result.questionId || idx}
              style={{
                padding: "18px 20px",
                borderRadius: "var(--radius-btn)",
                border: isCorrect ? "1px solid #BBF7D0" : "1px solid #FECACA",
                backgroundColor: isCorrect ? "#F0FDF4" : "#FEF2F2"
              }}
            >
              {/* Question header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-muted)" }}>
                  Question {idx + 1}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: isCorrect ? "var(--color-success)" : "var(--color-danger)"
                  }}
                >
                  {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                </span>
              </div>

              {/* Prompt */}
              <p style={{ fontSize: "15px", fontWeight: 500, marginBottom: "12px", color: "var(--color-text)" }}>
                {result.prompt}
              </p>

              {/* Option choices showing learner pick vs correct answer */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                {result.options.map((opt, oIdx) => {
                  const wasChosen = result.chosenIndex === oIdx;
                  const isAnswerKey = result.correctIndex === oIdx;

                  let border = "1px solid var(--color-border)";
                  let bg = "#FFFFFF";
                  let text = "var(--color-text)";

                  if (isAnswerKey) {
                    border = "1.5px solid var(--color-success)";
                    bg = "#DCFCE7";
                    text = "#166534";
                  } else if (wasChosen && !isCorrect) {
                    border = "1.5px solid var(--color-danger)";
                    bg = "#FEE2E2";
                    text = "#991B1B";
                  }

                  return (
                    <div
                      key={oIdx}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border,
                        backgroundColor: bg,
                        color: text,
                        fontSize: "13px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>{opt}</span>
                      <div style={{ fontSize: "11px", fontWeight: 600 }}>
                        {isAnswerKey && <span>✓ Correct Answer</span>}
                        {wasChosen && !isAnswerKey && <span>(Your choice)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation of the right answer */}
              {result.explanation && (
                <div
                  style={{
                    padding: "10px 14px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    fontSize: "13px",
                    color: "var(--color-text)",
                    lineHeight: "1.5",
                    marginBottom: result.mistakeNotes ? "8px" : "0"
                  }}
                >
                  <strong>💡 Explanation:</strong> {result.explanation}
                </div>
              )}

              {/* Mistake note / Common pitfall */}
              {result.mistakeNotes && (
                <div
                  style={{
                    padding: "10px 14px",
                    backgroundColor: "#FFFBEB",
                    borderRadius: "6px",
                    border: "1px solid #FDE68A",
                    fontSize: "13px",
                    color: "#92400E",
                    lineHeight: "1.5"
                  }}
                >
                  <strong>⚠️ Learning Insight:</strong> {result.mistakeNotes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          paddingTop: "16px",
          borderTop: "1px solid var(--color-border)"
        }}
      >
        <button className="btn btn-secondary" onClick={onRetake}>
          Retake Quiz ↺
        </button>

        <button
          className="btn btn-primary"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? "Generating New Questions..." : "Generate New Questions ⟳"}
        </button>
      </div>
    </div>
  );
}

export default FeedbackPanel;
