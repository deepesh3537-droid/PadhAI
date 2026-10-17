import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/apiClient.js";
import QuestionCard from "./QuestionCard.jsx";
import FeedbackPanel from "./FeedbackPanel.jsx";
import AttemptHistory from "./AttemptHistory.jsx";

/**
 * QuizRunner: Interactive quiz flow component for lessons.
 * Handles quiz loading, step-by-step answering, deterministic scoring submission,
 * feedback rendering, and attempt history.
 */
export function QuizRunner({ lessonId, lessonTitle, onQuizCompleted }) {
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active quiz state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [quizMode, setQuizMode] = useState("overview"); // 'overview' | 'taking' | 'feedback'

  const fetchQuiz = useCallback(async (regenerate = false) => {
    if (!lessonId) return;
    try {
      if (regenerate) {
        setIsRegenerating(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const url = regenerate
        ? `/lessons/${lessonId}/quiz?regenerate=true`
        : `/lessons/${lessonId}/quiz`;

      const data = await api.get(url);
      setQuiz(data.quiz || null);
      setAttempts(data.attempts || []);

      if (regenerate) {
        // Reset state for new quiz
        setSelectedAnswers({});
        setCurrentIdx(0);
        setActiveFeedback(null);
        setQuizMode("taking");
      }
    } catch (err) {
      setError(err.message || "Failed to load quiz");
    } finally {
      setLoading(false);
      setIsRegenerating(false);
    }
  }, [lessonId]);

  useEffect(() => {
    setSelectedAnswers({});
    setCurrentIdx(0);
    setActiveFeedback(null);
    setQuizMode("overview");
    fetchQuiz(false);
  }, [lessonId, fetchQuiz]);

  const handleSelectOption = (optionIndex) => {
    if (!quiz || !quiz.questions[currentIdx]) return;
    const questionId = quiz.questions[currentIdx].id;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleStartQuiz = () => {
    setSelectedAnswers({});
    setCurrentIdx(0);
    setActiveFeedback(null);
    setQuizMode("taking");
  };

  const handleSubmitAttempt = async () => {
    if (!quiz?.id || isSubmitting) return;

    // Verify all questions have been answered or warn
    const totalQ = quiz.questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < totalQ) {
      const confirmProceed = window.confirm(
        `You have answered ${answeredCount} of ${totalQ} questions. Unanswered questions will be scored as incorrect. Do you want to submit?`
      );
      if (!confirmProceed) return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/quizzes/${quiz.id}/attempts`, {
        answers: selectedAnswers
      });

      const attempt = response.attempt;
      setActiveFeedback(attempt.feedback);
      setAttempts((prev) => [attempt, ...prev]);
      setQuizMode("feedback");

      if (onQuizCompleted) {
        onQuizCompleted(attempt);
      }
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewAttempt = (attempt) => {
    if (attempt?.feedback) {
      setActiveFeedback(attempt.feedback);
      setQuizMode("feedback");
      window.scrollTo({ top: 300, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div
        className="card"
        style={{ padding: "32px", textAlign: "center", color: "var(--color-muted)" }}
        aria-live="polite"
      >
        <p style={{ fontWeight: 500, marginBottom: "6px" }}>Preparing Lesson Quiz...</p>
        <p style={{ fontSize: "13px" }}>Our local AI tutor is formulating questions for this lesson.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{ padding: "24px", border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2" }}
      >
        <p style={{ color: "var(--color-danger)", fontWeight: 500, marginBottom: "8px" }}>
          Failed to load quiz: {error}
        </p>
        <button className="btn btn-secondary" onClick={() => fetchQuiz(false)}>
          Retry Loading Quiz
        </button>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="card" style={{ padding: "32px", textAlign: "center" }}>
        <p style={{ color: "var(--color-muted)", marginBottom: "12px" }}>
          No quiz questions available for this lesson yet.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => fetchQuiz(true)}
          disabled={isRegenerating}
        >
          {isRegenerating ? "Generating Quiz..." : "Generate Lesson Quiz"}
        </button>
      </div>
    );
  }

  const questions = quiz.questions;
  const currentQuestion = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const latestAttempt = attempts[0];

  return (
    <section
      aria-label="Lesson Quiz"
      style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid var(--color-border)" }}
    >
      {/* Quiz Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>
            {quiz.title || `Lesson Quiz: ${lessonTitle}`}
          </h2>
          <span className="badge badge-primary" style={{ fontSize: "12px" }}>
            {questions.length} Questions
          </span>
        </div>

        {quizMode === "overview" && latestAttempt && (
          <span
            className="badge"
            style={{
              backgroundColor: latestAttempt.score >= 60 ? "#DCFCE7" : "#FEF3C7",
              color: latestAttempt.score >= 60 ? "var(--color-success)" : "var(--color-warning)",
              fontSize: "12px",
              fontWeight: 600
            }}
          >
            Best Score: {latestAttempt.score}%
          </span>
        )}
      </div>

      {/* OVERVIEW MODE */}
      {quizMode === "overview" && (
        <div
          className="card"
          style={{ padding: "28px", textAlign: "center", backgroundColor: "#FFFFFF" }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📝</div>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
            Test Your Knowledge
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-muted)",
              maxWidth: "500px",
              margin: "0 auto 20px",
              lineHeight: "1.5"
            }}
          >
            Check your understanding of the core objectives in this lesson. Answer {questions.length} multi-choice questions to receive instant, itemized feedback.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <button className="btn btn-primary" onClick={handleStartQuiz}>
              {attempts.length > 0 ? "Retake Quiz" : "Start Quiz"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => fetchQuiz(true)}
              disabled={isRegenerating}
            >
              {isRegenerating ? "Generating..." : "New Questions ⟳"}
            </button>
          </div>

          {/* Attempt History List */}
          <AttemptHistory attempts={attempts} onSelectAttempt={handleReviewAttempt} />
        </div>
      )}

      {/* TAKING QUIZ MODE */}
      {quizMode === "taking" && (
        <div>
          {/* Question Stepper Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "16px",
              overflowX: "auto",
              paddingBottom: "4px"
            }}
          >
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isActive = currentIdx === idx;

              return (
                <button
                  key={q.id || idx}
                  onClick={() => setCurrentIdx(idx)}
                  className="btn btn-ghost"
                  style={{
                    width: "34px",
                    height: "34px",
                    minHeight: "34px",
                    padding: 0,
                    borderRadius: "50%",
                    fontSize: "13px",
                    fontWeight: 600,
                    backgroundColor: isActive
                      ? "var(--color-primary-strong)"
                      : isAnswered
                      ? "var(--color-primary-light)"
                      : "#F1F5F9",
                    color: isActive
                      ? "#FFFFFF"
                      : isAnswered
                      ? "var(--color-primary-strong)"
                      : "var(--color-muted)",
                    border: isActive
                      ? "2px solid var(--color-primary-strong)"
                      : "1px solid var(--color-border)"
                  }}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Question Card */}
          <QuestionCard
            question={currentQuestion}
            questionIndex={currentIdx}
            totalQuestions={questions.length}
            selectedOption={selectedAnswers[currentQuestion.id]}
            onSelectOption={handleSelectOption}
          />

          {/* Navigation & Submission Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "16px"
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
            >
              ← Previous
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                className="btn btn-ghost"
                onClick={() => setQuizMode("overview")}
              >
                Cancel
              </button>

              {isLastQuestion ? (
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitAttempt}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Quiz 🎯"}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                >
                  Next Question →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODE */}
      {quizMode === "feedback" && activeFeedback && (
        <div>
          <FeedbackPanel
            feedback={activeFeedback}
            onRetake={handleStartQuiz}
            onRegenerate={() => fetchQuiz(true)}
            isRegenerating={isRegenerating}
          />

          {/* Attempt History */}
          <AttemptHistory attempts={attempts} onSelectAttempt={handleReviewAttempt} />
        </div>
      )}
    </section>
  );
}

export default QuizRunner;
