import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/apiClient.js";

export function DashboardPage({ onNavigateToNew, onSelectCourse }) {
  const { user, signOut } = useAuth();
  const [serverUser, setServerUser] = useState(null);
  const [serverStatus, setServerStatus] = useState("Checking backend...");
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  const loadCourses = () => {
    setLoadingCourses(true);
    setCoursesError("");
    api.get("/courses")
      .then((data) => {
        setCourses(data.courses || []);
      })
      .catch((err) => {
        console.warn("Failed to fetch courses:", err);
        setCoursesError(err.message || "Failed to load courses");
      })
      .finally(() => {
        setLoadingCourses(false);
      });
  };

  useEffect(() => {
    // TASK-020: Verify backend JWT authentication via /api/me
    api.get("/me")
      .then((data) => {
        setServerUser(data.user);
        setServerStatus("Server Verified (JWT Valid)");
      })
      .catch((err) => {
        console.warn("Backend auth check error:", err);
        setServerStatus("Backend Offline or Token Issue");
      });

    // TASK-032: Fetch courses for current user
    loadCourses();
  }, []);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 20px" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", paddingBottom: "16px", borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 style={{ fontSize: "28px", color: "var(--color-primary-strong)" }}>PadhAI</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>
            Welcome back, <strong>{serverUser?.fullName || user?.user_metadata?.full_name || user?.email}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span className="badge badge-primary">{serverStatus}</span>
          <button className="btn btn-secondary" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main dashboard content */}
      <main>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "20px" }}>Your Courses</h2>
          <button className="btn btn-primary" onClick={onNavigateToNew}>
            + Create New Course
          </button>
        </div>

        {/* Error state */}
        {coursesError && (
          <div className="error-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{coursesError}</span>
            <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={loadCourses}>
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loadingCourses ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid #E2E8F0", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px auto" }} />
            <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Loading your courses...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : courses.length === 0 ? (
          /* Empty state per DESIGN.md §3.2 */
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>📚</div>
            <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>No courses yet</h3>
            <p style={{ color: "var(--color-muted)", maxWidth: "460px", margin: "0 auto 24px auto", fontSize: "14px" }}>
              Enter any topic or syllabus, set your target depth, and PadhAI will automatically generate a structured course tailored to your goals.
            </p>
            <button
              className="btn btn-primary"
              onClick={onNavigateToNew}
            >
              Create your first course
            </button>
          </div>
        ) : (
          /* Course list grid */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {courses.map((course) => (
              <div
                key={course.id}
                className="card"
                style={{ cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}
                onClick={() => onSelectCourse && onSelectCourse(course)}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                    <h3 style={{ fontSize: "17px", color: "var(--color-text)" }}>{course.title}</h3>
                    <span className="badge badge-primary" style={{ textTransform: "capitalize", flexShrink: 0 }}>
                      {course.target_depth}
                    </span>
                  </div>
                  {course.description && (
                    <p style={{ color: "var(--color-muted)", fontSize: "13px", marginBottom: "12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {course.description}
                    </p>
                  )}
                  {course.goal && (
                    <div style={{ padding: "8px 10px", backgroundColor: "#F8FAFC", borderRadius: "var(--radius-btn)", border: "1px solid var(--color-border)", fontSize: "12px", color: "var(--color-muted)", marginBottom: "14px" }}>
                      <strong>Goal:</strong> {course.goal}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--color-border)" }}>
                  <span className="badge" style={{ backgroundColor: "#F1F5F9", color: "var(--color-muted)", fontSize: "11px", textTransform: "uppercase" }}>
                    {course.status || "ready"}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--color-primary-strong)", fontWeight: 500 }}>
                    View Outline →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
