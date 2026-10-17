import React from "react";

/**
 * QuestionCard: Renders a single quiz question with accessible option selection.
 * Supports keyboard navigation and clear visual active/focus states.
 */
export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selectedOption,
  onSelectOption
}) {
  if (!question) return null;

  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  const handleKeyDown = (e, idx) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectOption(idx);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: "24px",
        marginBottom: "20px",
        border: "1px solid var(--color-border)"
      }}
      role="region"
      aria-label={`Question ${questionIndex + 1} of ${totalQuestions}`}
    >
      {/* Progress & Question Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px"
        }}
      >
        <span
          className="badge badge-primary"
          style={{ fontSize: "12px", fontWeight: 600 }}
        >
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
          Select the best answer
        </span>
      </div>

      {/* Question Prompt */}
      <h2
        style={{
          fontSize: "18px",
          fontWeight: 600,
          lineHeight: "1.5",
          marginBottom: "20px",
          color: "var(--color-text)"
        }}
      >
        {question.prompt}
      </h2>

      {/* Options List */}
      <div
        role="radiogroup"
        aria-label={question.prompt}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        {question.options.map((optionText, idx) => {
          const isSelected = selectedOption === idx;
          const letter = optionLetters[idx] || `${idx + 1}`;

          return (
            <div
              key={idx}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectOption(idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 16px",
                borderRadius: "var(--radius-btn)",
                border: isSelected
                  ? "2px solid var(--color-primary-strong)"
                  : "1px solid var(--color-border)",
                backgroundColor: isSelected
                  ? "var(--color-primary-light)"
                  : "var(--color-surface)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                userSelect: "none"
              }}
            >
              {/* Option Letter Pill */}
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: isSelected
                    ? "var(--color-primary-strong)"
                    : "#F1F5F9",
                  color: isSelected ? "#FFFFFF" : "var(--color-muted)",
                  flexShrink: 0
                }}
              >
                {letter}
              </div>

              {/* Option Text */}
              <span
                style={{
                  fontSize: "14px",
                  lineHeight: "1.4",
                  fontWeight: isSelected ? 500 : 400,
                  color: isSelected ? "var(--color-primary-strong)" : "var(--color-text)"
                }}
              >
                {optionText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default QuestionCard;
