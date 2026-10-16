import React, { useState, useEffect } from "react";
import { api } from "../lib/apiClient.js";

export function LessonPage({ course, initialLessonId, onBackToCourse, onSelectLesson }) {
  // Flatten all lessons across modules to calculate order and prev/next
  const flattenedLessons = React.useMemo(() => {
    const list = [];
    if (course?.modules) {
      course.modules.forEach((mod, mIdx) => {
        if (mod.lessons) {
          mod.lessons.forEach((les, lIdx) => {
            list.push({
              ...les,
              moduleTitle: mod.title,
              moduleIndex: mIdx,
              lessonIndex: lIdx
            });
          });
        }
      });
    }
    return list;
  }, [course]);

  const [currentLessonId, setCurrentLessonId] = useState(
    initialLessonId || flattenedLessons[0]?.id || null
  );
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [markingComplete, setMarkingComplete] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const currentIndex = flattenedLessons.findIndex((l) => l.id === currentLessonId);
  const currentLesson = flattenedLessons[currentIndex] || flattenedLessons[0];
  const prevLesson = currentIndex > 0 ? flattenedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < flattenedLessons.length - 1
    ? flattenedLessons[currentIndex + 1]
    : null;

  // Load course completion status
  useEffect(() => {
    if (course?.id) {
      api.get(`/courses/${course.id}/progress`)
        .then((data) => {
          if (data?.progress?.completedLessonIds) {
            setCompletedLessonIds(new Set(data.progress.completedLessonIds));
          }
        })
        .catch((err) => console.warn("Failed to load course progress:", err));
    }
  }, [course?.id]);

  const handleMarkComplete = async () => {
    if (!currentLesson?.id) return;
    setMarkingComplete(true);
    setStatusMsg("");

    try {
      await api.post(`/lessons/${currentLesson.id}/complete`);
      setCompletedLessonIds((prev) => new Set([...prev, currentLesson.id]));
      setStatusMsg("Lesson marked complete!");
    } catch (err) {
      setStatusMsg(err.message || "Failed to mark lesson complete");
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleNavigateLesson = (lesson) => {
    setCurrentLessonId(lesson.id);
    setStatusMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (onSelectLesson) onSelectLesson(lesson);
  };

  if (!currentLesson) {
    return (
      <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 20px" }}>
        <button className="btn btn-ghost" onClick={onBackToCourse} style={{ marginBottom: "20px" }}>
          ← Back to Course Outline
        </button>
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "var(--color-muted)" }}>No lesson selected or course is empty.</p>
        </div>
      </div>
    );
  }

  const isCompleted = completedLessonIds.has(currentLesson.id);

  return (
    <div style={{ maxWidth: "1050px", margin: "32px auto", padding: "0 20px" }}>
      {/* Navigation Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <button className="btn btn-ghost" onClick={onBackToCourse}>
          ← Back to Course Outline
        </button>
        <div style={{ fontSize: "14px", color: "var(--color-muted)" }}>
          Lesson {currentIndex + 1} of {flattenedLessons.length}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "24px", alignItems: "start" }}>
        {/* Main Lesson Workspace */}
        <main>
          <div className="card" style={{ marginBottom: "24px" }}>
            {/* Header info */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "var(--color-primary-strong)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Module {currentLesson.moduleIndex + 1}: {currentLesson.moduleTitle}
              </div>
              <h1 style={{ fontSize: "26px", marginTop: "6px", marginBottom: "8px" }}>
                {currentLesson.title}
              </h1>
              {isCompleted && (
                <span className="badge badge-success" style={{ marginBottom: "12px" }}>
                  ✓ Completed
                </span>
              )}
            </div>

            {/* Lesson Summary */}
            {currentLesson.summary && (
              <div style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--color-text)", marginBottom: "24px" }}>
                {currentLesson.summary}
              </div>
            )}

            {/* Learning Objectives */}
            {currentLesson.objectives && currentLesson.objectives.length > 0 && (
              <div style={{ padding: "16px 20px", backgroundColor: "#F8FAFC", borderRadius: "var(--radius-btn)", border: "1px solid var(--color-border)", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                  Key Objectives:
                </h3>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "var(--color-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {currentLesson.objectives.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "20px", borderTop: "1px solid var(--color-border)" }}>
              <button
                className={`btn ${isCompleted ? "btn-secondary" : "btn-primary"}`}
                onClick={handleMarkComplete}
                disabled={markingComplete || isCompleted}
              >
                {isCompleted ? "✓ Completed" : markingComplete ? "Saving..." : "Mark as Complete"}
              </button>

              {statusMsg && (
                <span style={{ fontSize: "13px", color: isCompleted ? "var(--color-success)" : "var(--color-danger)" }}>
                  {statusMsg}
                </span>
              )}
            </div>
          </div>

          {/* Prev / Next Lesson Navigation (Boundary-aware) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {prevLesson ? (
              <button
                className="btn btn-secondary"
                onClick={() => handleNavigateLesson(prevLesson)}
              >
                ← Previous: {prevLesson.title}
              </button>
            ) : <div />}

            {nextLesson ? (
              <button
                className="btn btn-primary"
                onClick={() => handleNavigateLesson(nextLesson)}
              >
                Next: {nextLesson.title} →
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={onBackToCourse}>
                Return to Course Outline 🏁
              </button>
            )}
          </div>
        </main>

        {/* Side Lesson Navigator */}
        <aside className="card" style={{ padding: "16px" }}>
          <h3 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>
            Lessons in this Course
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {flattenedLessons.map((les, idx) => {
              const active = les.id === currentLesson.id;
              const done = completedLessonIds.has(les.id);

              return (
                <button
                  key={les.id || idx}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: "space-between",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    backgroundColor: active ? "var(--color-primary-light)" : "transparent",
                    color: active ? "var(--color-primary-strong)" : "var(--color-text)",
                    fontWeight: active ? 600 : 400,
                    fontSize: "13px"
                  }}
                  onClick={() => handleNavigateLesson(les)}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {idx + 1}. {les.title}
                  </span>
                  {done && (
                    <span style={{ color: "var(--color-success)", fontSize: "12px", marginLeft: "6px" }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default LessonPage;
