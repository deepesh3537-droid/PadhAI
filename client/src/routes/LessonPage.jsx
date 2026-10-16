import React, { useState, useEffect } from "react";
import { api } from "../lib/apiClient.js";
import { VideoEmbed, extractYouTubeId } from "../components/ui/VideoEmbed.jsx";
import { FallbackLinkCard } from "../components/ui/FallbackLinkCard.jsx";

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
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [researchJob, setResearchJob] = useState(null);
  const [retryingResearch, setRetryingResearch] = useState(false);

  const currentIndex = flattenedLessons.findIndex((l) => l.id === currentLessonId);
  const currentLesson = flattenedLessons[currentIndex] || flattenedLessons[0];
  const prevLesson = currentIndex > 0 ? flattenedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < flattenedLessons.length - 1
    ? flattenedLessons[currentIndex + 1]
    : null;

  const loadResources = (lessonId) => {
    if (!lessonId) return;
    setLoadingResources(true);
    api.get(`/lessons/${lessonId}/resources`)
      .then((data) => {
        setResources(data?.resources || []);
      })
      .catch((err) => {
        console.warn("Failed to load lesson resources:", err);
      })
      .finally(() => {
        setLoadingResources(false);
      });
  };

  // Load resources for current lesson
  useEffect(() => {
    if (!currentLesson?.id) return;
    loadResources(currentLesson.id);
  }, [currentLesson?.id]);

  // Poll research job status if active ('queued' or 'researching')
  useEffect(() => {
    if (!course?.id) return;

    let timer = null;
    let isCancelled = false;

    const checkJobStatus = () => {
      api.get(`/courses/${course.id}/research/status`)
        .then((data) => {
          if (isCancelled) return;
          const job = data?.job || null;
          setResearchJob(job);

          // If still active, poll again responsibly in 3 seconds
          if (job?.status === "queued" || job?.status === "researching") {
            timer = setTimeout(checkJobStatus, 3000);
          } else if (job?.status === "completed") {
            // Reload resources when research completes
            if (currentLesson?.id) {
              loadResources(currentLesson.id);
            }
          }
        })
        .catch((err) => {
          console.warn("Failed to check research status:", err);
        });
    };

    checkJobStatus();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [course?.id, currentLesson?.id]);

  const handleTriggerResearch = async () => {
    if (!course?.id || retryingResearch) return;
    setRetryingResearch(true);
    try {
      const res = await api.post(`/courses/${course.id}/research`);
      setResearchJob({
        status: res.status || "queued",
        current_step: "queued"
      });
    } catch (err) {
      console.warn("Failed to trigger research:", err);
    } finally {
      setRetryingResearch(false);
    }
  };

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

  // Extract primary video resource if any
  const videoResource = resources.find((r) =>
    r.resource_type === "video" || extractYouTubeId(r.url)
  );

  // Other non-video resources or all resources if no embeddable video
  const otherResources = resources.filter((r) => r.id !== videoResource?.id);

  // Progress metrics for indicator
  const progressPercent = Math.round((completedLessonIds.size / Math.max(1, flattenedLessons.length)) * 100);

  return (
    <div style={{ maxWidth: "1050px", margin: "32px auto", padding: "0 20px" }}>
      {/* Navigation & Progress Header (TASK-050) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <button className="btn btn-ghost" onClick={onBackToCourse}>
          ← Back to Course Outline
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "13px", color: "var(--color-muted)" }}>
            Lesson <strong>{currentIndex + 1}</strong> of <strong>{flattenedLessons.length}</strong>
          </div>
          <span className="badge badge-primary" style={{ fontSize: "11px" }}>
            {progressPercent}% Complete
          </span>
        </div>
      </div>

      <div className="lesson-workspace-layout">
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

            {/* VideoEmbed Player (TASK-047 / ADR-015) */}
            {videoResource && (
              <VideoEmbed
                url={videoResource.url}
                title={videoResource.title}
                author={videoResource.author}
              />
            )}

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

            {/* TASK-045, TASK-048, TASK-049: Recommended Resources Section */}
            <section style={{ marginBottom: "28px", paddingTop: "20px", borderTop: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Recommended Learning Resources</h3>
                  {researchJob?.status === "researching" && (
                    <span className="badge badge-warning" style={{ fontSize: "11px", animation: "pulse 1.5s infinite" }}>
                      ● Researching web sources...
                    </span>
                  )}
                  {researchJob?.status === "queued" && (
                    <span className="badge" style={{ backgroundColor: "#F1F5F9", color: "var(--color-muted)", fontSize: "11px" }}>
                      Research queued
                    </span>
                  )}
                  {researchJob?.status === "failed" && (
                    <span className="badge" style={{ backgroundColor: "#FEE2E2", color: "var(--color-danger)", fontSize: "11px" }}>
                      Search unavailable
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="badge" style={{ backgroundColor: "#F1F5F9", color: "var(--color-muted)", fontSize: "12px" }}>
                    {loadingResources ? "Checking sources..." : `${resources.length} verified`}
                  </span>

                  {(resources.length === 0 || researchJob?.status === "failed") && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "12px", padding: "4px 8px" }}
                      onClick={handleTriggerResearch}
                      disabled={retryingResearch || researchJob?.status === "researching" || researchJob?.status === "queued"}
                    >
                      {retryingResearch ? "Starting..." : researchJob?.status === "failed" ? "Retry Research ⟳" : "Find Resources 🔍"}
                    </button>
                  )}
                </div>
              </div>

              {/* Safe error banner if research job failed */}
              {researchJob?.status === "failed" && researchJob?.safe_error && (
                <div style={{ padding: "10px 14px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "var(--radius-btn)", fontSize: "13px", color: "#991B1B", marginBottom: "12px" }}>
                  {researchJob.safe_error}
                </div>
              )}

              {loadingResources ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--color-muted)", fontSize: "13px" }}>
                  Loading educational resources...
                </div>
              ) : resources.length === 0 ? (
                <div style={{ padding: "20px 16px", backgroundColor: "#F8FAFC", borderRadius: "var(--radius-btn)", border: "1px dashed var(--color-border)", fontSize: "13px", color: "var(--color-muted)", textAlign: "center" }}>
                  {researchJob?.status === "researching" || researchJob?.status === "queued" ? (
                    <div>
                      <p style={{ fontWeight: 500, marginBottom: "4px" }}>Searching for educational guides and articles...</p>
                      <p style={{ fontSize: "12px" }}>Background worker is actively searching and verifying sources.</p>
                    </div>
                  ) : researchJob?.status === "failed" ? (
                    <div>
                      <p style={{ fontWeight: 500, marginBottom: "4px" }}>Search provider could not be reached.</p>
                      <p style={{ fontSize: "12px", marginBottom: "10px" }}>Make sure local SearXNG is running on port 8080 or check server settings.</p>
                      <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={handleTriggerResearch} disabled={retryingResearch}>
                        Retry Search
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 500, marginBottom: "4px" }}>No external resources linked to this lesson yet.</p>
                      <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px", marginTop: "6px" }} onClick={handleTriggerResearch} disabled={retryingResearch}>
                        Search Web for Resources
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {otherResources.map((res, rIdx) => (
                    <FallbackLinkCard key={res.id || rIdx} resource={res} />
                  ))}
                </div>
              )}
            </section>

            {/* Action Bar (Lesson Completion) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "20px",
                borderTop: "1px solid var(--color-border)",
                marginTop: "8px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  className={`btn ${isCompleted ? "btn-secondary" : "btn-primary"}`}
                  onClick={handleMarkComplete}
                  disabled={markingComplete || isCompleted}
                  style={{ minWidth: "160px" }}
                >
                  {isCompleted ? "✓ Completed" : markingComplete ? "Saving..." : "Mark as Complete"}
                </button>

                {statusMsg && (
                  <span style={{ fontSize: "13px", fontWeight: 500, color: isCompleted ? "var(--color-success)" : "var(--color-danger)" }}>
                    {statusMsg}
                  </span>
                )}
              </div>

              {isCompleted && (
                <span className="badge badge-success" style={{ fontSize: "12px" }}>
                  Completed
                </span>
              )}
            </div>
          </div>

          {/* Prev / Next Lesson Navigation (Boundary-aware) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
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

        {/* Side Lesson Navigator (TASK-050 / TASK-051) */}
        <aside className="card lesson-nav-aside" style={{ padding: "16px" }}>
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
