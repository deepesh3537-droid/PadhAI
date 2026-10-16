import React, { useEffect, useState } from "react";
import { api } from "../lib/apiClient.js";
import { ProgressBar } from "../components/ui/ProgressBar.jsx";

export function CoursePage({ courseId, initialCourse, onBack, onSelectLesson }) {
  const targetCourseId = courseId || initialCourse?.id;
  const initialHasCurriculum = Boolean(initialCourse?.modules && initialCourse.modules.length > 0);

  const [course, setCourse] = useState(initialCourse || null);
  const [loading, setLoading] = useState(!initialHasCurriculum && Boolean(targetCourseId));
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(null);
  // Default: all modules open or first module open
  const [expandedModules, setExpandedModules] = useState({ 0: true });

  const toggleModule = (index) => {
    setExpandedModules((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const expandAll = () => {
    if (!course?.modules) return;
    const all = {};
    course.modules.forEach((_, idx) => {
      all[idx] = true;
    });
    setExpandedModules(all);
  };

  const collapseAll = () => {
    setExpandedModules({});
  };

  useEffect(() => {
    let isCancelled = false;
    const targetId = courseId || initialCourse?.id;

    if (!targetId) {
      setLoading(false);
      return;
    }

    // Always fetch latest progress
    api.get(`/courses/${targetId}/progress`)
      .then((data) => {
        if (!isCancelled) {
          setProgress(data.progress);
        }
      })
      .catch((err) => console.warn("Failed to load progress:", err));

    // If initialCourse already has modules (e.g. freshly generated), use it directly
    if (initialCourse?.modules && initialCourse.modules.length > 0 && initialCourse.id === targetId) {
      setCourse(initialCourse);
      setLoading(false);
      setErrorMsg("");
      const all = {};
      initialCourse.modules.forEach((_, idx) => {
        all[idx] = true;
      });
      setExpandedModules(all);
      return () => {
        isCancelled = true;
      };
    }

    // Otherwise, fetch full course details (modules and lessons)
    setLoading(true);
    setErrorMsg("");

    api.get(`/courses/${targetId}`)
      .then((data) => {
        if (isCancelled) return;
        const fetchedCourse = data.course;
        setCourse(fetchedCourse);
        if (fetchedCourse?.modules) {
          const all = {};
          fetchedCourse.modules.forEach((_, idx) => {
            all[idx] = true;
          });
          setExpandedModules(all);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setErrorMsg(err.message || "Failed to load course details");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [courseId, initialCourse]);

  if (loading) {
    return (
      <div style={{ maxWidth: "900px", margin: "40px auto", textAlign: "center", padding: "40px 20px" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid #E2E8F0", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px auto" }} />
        <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Loading course outline...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (errorMsg || !course) {
    return (
      <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 20px" }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
          ← Back to Dashboard
        </button>
        <div className="error-banner">{errorMsg || "Course not found"}</div>
      </div>
    );
  }

  const allExpanded = course.modules?.every((_, idx) => expandedModules[idx]);

  return (
    <div style={{ maxWidth: "900px", margin: "32px auto", padding: "0 20px" }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        ← Back to Dashboard
      </button>

      {/* Course Overview Header */}
      <div className="card" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px" }}>
          <h1 style={{ fontSize: "26px", color: "var(--color-text)" }}>{course.title}</h1>
          <span className="badge badge-primary" style={{ textTransform: "capitalize" }}>
            {course.target_depth}
          </span>
        </div>
        {course.description && (
          <p style={{ color: "var(--color-muted)", fontSize: "15px", marginBottom: "16px" }}>
            {course.description}
          </p>
        )}
        <div style={{ padding: "12px 16px", backgroundColor: "#F8FAFC", borderRadius: "var(--radius-btn)", border: "1px solid var(--color-border)", fontSize: "14px", marginBottom: progress ? "16px" : "0" }}>
          <strong>Goal:</strong> {course.goal}
        </div>

        {/* Course Progress Bar (TASK-037) */}
        {progress && (
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
            <ProgressBar
              percent={progress.percentCompleted || 0}
              label={`Course Progress: ${progress.completedCount || 0} of ${progress.totalLessons || 0} lessons completed`}
              height={10}
            />
          </div>
        )}
      </div>

      {/* Modules and Lessons Hierarchy */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "20px" }}>Curriculum Outline</h2>
          <button
            className="btn btn-ghost"
            style={{ fontSize: "13px", padding: "6px 12px" }}
            onClick={allExpanded ? collapseAll : expandAll}
          >
            {allExpanded ? "Collapse All Modules" : "Expand All Modules"}
          </button>
        </div>

        {(!course.modules || course.modules.length === 0) ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ color: "var(--color-muted)", fontSize: "15px", marginBottom: "8px" }}>
              No curriculum modules found for this course.
            </p>
            <p style={{ color: "var(--color-muted)", fontSize: "13px" }}>
              The course outline may still be generating or the curriculum is empty.
            </p>
          </div>
        ) : (
          course.modules.map((mod, mIdx) => {
          const isExpanded = !!expandedModules[mIdx];
          const lessonCount = mod.lessons?.length || 0;

          return (
            <div key={mod.id || mIdx} className="card" style={{ padding: "20px" }}>
              {/* Collapsible Module Header */}
              <div
                onClick={() => toggleModule(mIdx)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "var(--color-primary-strong)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Module {mIdx + 1}
                  </div>
                  <h3 style={{ fontSize: "18px", marginTop: "2px" }}>{mod.title}</h3>
                  {mod.description && (
                    <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
                      {mod.description}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <span className="badge" style={{ backgroundColor: "#F1F5F9", color: "var(--color-muted)", fontSize: "12px" }}>
                    {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
                  </span>
                  <span style={{ fontSize: "16px", color: "var(--color-muted)", transition: "transform 0.2s ease", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ▼
                  </span>
                </div>
              </div>

              {/* Lessons List (Collapsible Body) */}
              {isExpanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
                  {mod.lessons?.map((lesson, lIdx) => (
                    <div
                      key={lesson.id || lIdx}
                      style={{
                        padding: "14px 16px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-btn)",
                        transition: "border-color 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h4 style={{ fontSize: "15px", fontWeight: 600 }}>
                            Lesson {mIdx + 1}.{lIdx + 1}: {lesson.title}
                          </h4>
                          {progress?.completedLessonIds?.includes(lesson.id) && (
                            <span className="badge badge-success" style={{ fontSize: "11px", padding: "2px 8px" }}>
                              ✓ Completed
                            </span>
                          )}
                        </div>
                        {onSelectLesson && (
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                            onClick={() => onSelectLesson({ lesson, module: mod, course })}
                          >
                            Open Lesson →
                          </button>
                        )}
                      </div>
                      {lesson.summary && (
                        <p style={{ color: "var(--color-muted)", fontSize: "13px", marginTop: "4px" }}>
                          {lesson.summary}
                        </p>
                      )}

                      {lesson.objectives && lesson.objectives.length > 0 && (
                        <div style={{ marginTop: "10px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", marginBottom: "4px" }}>
                            Learning Objectives:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "var(--color-muted)" }}>
                            {lesson.objectives.map((obj, oIdx) => (
                              <li key={oIdx}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

export default CoursePage;
