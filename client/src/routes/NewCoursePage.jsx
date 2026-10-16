import React, { useState } from "react";
import { api } from "../lib/apiClient.js";

export function NewCoursePage({ onCourseCreated, onCancel }) {
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [depth, setDepth] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const data = await api.post("/courses", {
        topic: topic.trim(),
        goal: goal.trim(),
        depth
      });

      if (data?.course) {
        onCourseCreated(data.course);
      }
    } catch (err) {
      setErrorMsg(
        err.message || "Failed to generate course. Please verify local model status and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "40px auto", padding: "0 20px" }}>
      <button className="btn btn-ghost" onClick={onCancel} style={{ marginBottom: "20px" }}>
        ← Back to Dashboard
      </button>

      <div className="card">
        <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Create a New Course</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "24px" }}>
          Provide your topic, desired depth, and learning goal. PadhAI will automatically structure a custom curriculum using our local AI engine.
        </p>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          {/* Topic Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="topic">Topic</label>
            <input
              id="topic"
              type="text"
              className="form-input"
              placeholder="e.g. Calculus for Machine Learning, Linear Algebra, React State Management"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              disabled={loading}
              maxLength={200}
            />
          </div>

          {/* Goal Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="goal">Your Learning Goal</label>
            <textarea
              id="goal"
              className="form-input"
              style={{ minHeight: "90px", resize: "vertical" }}
              placeholder="What specifically do you want to achieve or build? (e.g. Master gradient descent, pass college exam, build a full-stack app)"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
              disabled={loading}
              maxLength={500}
            />
          </div>

          {/* Depth Selection */}
          <div className="form-group">
            <label className="form-label">Target Depth</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {["beginner", "intermediate", "advanced"].map((level) => (
                <button
                  type="button"
                  key={level}
                  className={`btn ${depth === level ? "btn-primary" : "btn-secondary"}`}
                  style={{ textTransform: "capitalize", padding: "10px" }}
                  onClick={() => setDepth(level)}
                  disabled={loading}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "16px", minHeight: "46px" }}
            disabled={loading}
          >
            {loading ? "Generating curriculum with local AI... (this takes ~10-20s)" : "Generate My Course"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default NewCoursePage;
