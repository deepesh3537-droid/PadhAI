import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/apiClient.js";

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const [serverUser, setServerUser] = useState(null);
  const [serverStatus, setServerStatus] = useState("Checking backend...");

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
          <button className="btn btn-primary" onClick={() => alert("Milestone 1 course generator will be connected in Phase 2!")}>
            + Create New Course
          </button>
        </div>

        {/* Empty state per DESIGN.md §3.2 */}
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📚</div>
          <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>No courses yet</h3>
          <p style={{ color: "var(--color-muted)", maxWidth: "460px", margin: "0 auto 24px auto", fontSize: "14px" }}>
            Enter any topic or syllabus, set your target depth, and PadhAI will automatically generate a structured course tailored to your goals.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => alert("Milestone 1 course generator will be connected in Phase 2!")}
          >
            Create your first course
          </button>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
