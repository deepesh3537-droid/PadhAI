import React, { useState, useRef } from "react";
import { api } from "../lib/apiClient.js";

export function NewCoursePage({ onCourseCreated, onCancel }) {
  const [activeTab, setActiveTab] = useState("topic"); // "topic" | "syllabus"

  // Topic input state
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [depth, setDepth] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Syllabus upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [parsedSyllabus, setParsedSyllabus] = useState(null);
  const fileInputRef = useRef(null);

  // Handle standard topic-based course generation
  const handleTopicSubmit = async (e) => {
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

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg("");
      setExtractedData(null);
      setParsedSyllabus(null);
    }
  };

  // Handle syllabus extraction and parsing (TASK-077, TASK-078, TASK-079)
  const handleExtractAndParse = async () => {
    setErrorMsg("");
    setExtracting(true);

    try {
      let extractRes;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("syllabus", selectedFile);
        extractRes = await api.upload("/syllabus/extract", formData);
      } else if (pastedText.trim()) {
        extractRes = await api.post("/syllabus/extract", {
          text: pastedText.trim(),
          filename: "pasted_syllabus.txt"
        });
      } else {
        throw new Error("Please select a syllabus file (.pdf, .txt, .md) or paste syllabus text.");
      }

      setExtractedData(extractRes);

      // Next, parse structure and detect ambiguities without inventing topics (TASK-079)
      const parseRes = await api.post("/syllabus/parse", {
        text: extractRes.text,
        filename: extractRes.filename
      });

      setParsedSyllabus(parseRes.parsedSyllabus);
    } catch (err) {
      setErrorMsg(err.message || "Failed to parse syllabus. Please ensure the document contains readable text.");
    } finally {
      setExtracting(false);
    }
  };

  // Handle course generation from approved syllabus (TASK-080)
  const handleGenerateFromSyllabus = async () => {
    if (!parsedSyllabus) return;
    setErrorMsg("");
    setLoading(true);

    try {
      const data = await api.post("/syllabus/generate", {
        parsedSyllabus,
        goal: goal.trim(),
        depth
      });

      if (data?.course) {
        onCourseCreated(data.course);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to generate course from syllabus. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "720px", margin: "40px auto", padding: "0 20px" }}>
      <button className="btn btn-ghost" onClick={onCancel} style={{ marginBottom: "20px" }}>
        ← Back to Dashboard
      </button>

      <div className="card">
        {/* Creation Mode Tabs (TASK-077, TASK-080) */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--color-border)", paddingBottom: "16px", marginBottom: "24px" }}>
          <button
            type="button"
            className={`btn ${activeTab === "topic" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: "14px", padding: "8px 16px" }}
            onClick={() => { setActiveTab("topic"); setErrorMsg(""); }}
            disabled={loading || extracting}
          >
            Generate from Topic
          </button>
          <button
            type="button"
            className={`btn ${activeTab === "syllabus" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: "14px", padding: "8px 16px" }}
            onClick={() => { setActiveTab("syllabus"); setErrorMsg(""); }}
            disabled={loading || extracting}
          >
            📄 Upload Syllabus (PDF / TXT / MD)
          </button>
        </div>

        {errorMsg && <div className="error-banner" style={{ marginBottom: "20px" }}>{errorMsg}</div>}

        {/* MODE 1: Topic Input */}
        {activeTab === "topic" && (
          <div>
            <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>Create a Custom Course</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "24px" }}>
              Provide your topic, desired depth, and learning goal. PadhAI will automatically structure a custom curriculum using our local AI engine.
            </p>

            <form onSubmit={handleTopicSubmit}>
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

              <div className="form-group">
                <label className="form-label" htmlFor="goal">Your Learning Goal</label>
                <textarea
                  id="goal"
                  className="form-input"
                  style={{ minHeight: "85px", resize: "vertical" }}
                  placeholder="What specifically do you want to achieve or build? (e.g. Master gradient descent, pass college exam)"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={500}
                />
              </div>

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

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "16px", minHeight: "46px" }}
                disabled={loading}
              >
                {loading ? "Generating curriculum with local AI... (takes ~10-20s)" : "Generate My Course"}
              </button>
            </form>
          </div>
        )}

        {/* MODE 2: Syllabus Upload (Phase 9) */}
        {activeTab === "syllabus" && (
          <div>
            <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>Upload Course Syllabus</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "20px" }}>
              Upload an academic course syllabus or document (.pdf, .txt, .md). PadhAI extracts the authentic curriculum, preserves your modules, and flags any ambiguities without hallucinating missing topics.
            </p>

            {/* Step 1: Upload or Paste Document */}
            {!parsedSyllabus && (
              <div>
                <div
                  style={{
                    border: "2px dashed var(--color-border)",
                    borderRadius: "var(--radius-card)",
                    padding: "32px 20px",
                    textAlign: "center",
                    backgroundColor: "#F8FAFC",
                    cursor: "pointer",
                    marginBottom: "16px"
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
                  <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "4px" }}>
                    {selectedFile ? selectedFile.name : "Click to select a syllabus document"}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--color-muted)" }}>
                    Supported formats: PDF, TXT, Markdown (Max 5 MB)
                  </div>
                  {selectedFile && (
                    <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--color-primary-strong)" }}>
                      Selected size: {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "center", margin: "14px 0", color: "var(--color-muted)", fontSize: "12px" }}>
                  — OR PASTE SYLLABUS TEXT BELOW —
                </div>

                <div className="form-group">
                  <textarea
                    className="form-input"
                    style={{ minHeight: "110px", resize: "vertical", fontSize: "13px" }}
                    placeholder="Paste syllabus modules, chapters, or lecture schedule directly..."
                    value={pastedText}
                    onChange={(e) => {
                      setPastedText(e.target.value);
                      if (e.target.value.trim()) setSelectedFile(null);
                    }}
                    disabled={extracting}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%", minHeight: "44px", marginTop: "10px" }}
                  onClick={handleExtractAndParse}
                  disabled={extracting || (!selectedFile && !pastedText.trim())}
                >
                  {extracting ? "Extracting & Analyzing Syllabus Structure..." : "Extract & Review Syllabus Structure"}
                </button>
              </div>
            )}

            {/* Step 2: Review Parsed Syllabus & Generate Course (TASK-079, TASK-080) */}
            {parsedSyllabus && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span className="badge badge-success" style={{ fontSize: "12px" }}>
                    ✓ Syllabus Extracted ({parsedSyllabus.detectedTopicCount || 0} topics detected)
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: "12px" }}
                    onClick={() => { setParsedSyllabus(null); setExtractedData(null); }}
                  >
                    Upload Different File ⟳
                  </button>
                </div>

                {/* Detected Title */}
                <div style={{ marginBottom: "16px", padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: "var(--radius-btn)", border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: "12px", color: "var(--color-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                    Detected Course Title
                  </div>
                  <h3 style={{ fontSize: "18px", marginTop: "4px", marginBottom: "6px" }}>
                    {parsedSyllabus.title}
                  </h3>
                  {parsedSyllabus.description && (
                    <p style={{ fontSize: "13px", color: "var(--color-muted)", margin: 0 }}>
                      {parsedSyllabus.description}
                    </p>
                  )}
                </div>

                {/* Ambiguity Flagging Banner (TASK-079, PRD §6 F1) */}
                {parsedSyllabus.ambiguities && parsedSyllabus.ambiguities.length > 0 && (
                  <div style={{ padding: "12px 16px", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "var(--radius-btn)", marginBottom: "20px", fontSize: "13px", color: "#92400E" }}>
                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                      ⚠️ Clarifications / Ambiguities Flagged:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "2px" }}>
                      {parsedSyllabus.ambiguities.map((amb, idx) => (
                        <li key={idx}>{amb}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Structured Modules Preview */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                    Syllabus Modules & Topics ({parsedSyllabus.modules?.length || 0}):
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "260px", overflowY: "auto", paddingRight: "4px" }}>
                    {parsedSyllabus.modules?.map((mod, idx) => (
                      <div key={idx} style={{ padding: "10px 14px", backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)", borderRadius: "var(--radius-btn)" }}>
                        <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
                          {idx + 1}. {mod.title}
                        </div>
                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "var(--color-muted)" }}>
                          {mod.topics?.map((top, tIdx) => (
                            <li key={tIdx}>{top}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Learner Preferences */}
                <div className="form-group">
                  <label className="form-label" htmlFor="syllabus-goal">Your Specific Learning Goal (Optional)</label>
                  <input
                    id="syllabus-goal"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Master this curriculum for upcoming university finals"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    disabled={loading}
                    maxLength={500}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Depth</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    {["beginner", "intermediate", "advanced"].map((level) => (
                      <button
                        type="button"
                        key={level}
                        className={`btn ${depth === level ? "btn-primary" : "btn-secondary"}`}
                        style={{ textTransform: "capitalize", padding: "8px" }}
                        onClick={() => setDepth(level)}
                        disabled={loading}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Final Generation Submit */}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%", minHeight: "46px", marginTop: "16px" }}
                  onClick={handleGenerateFromSyllabus}
                  disabled={loading}
                >
                  {loading ? "Generating course from syllabus... (this takes ~10-20s)" : "Generate Course from This Syllabus"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NewCoursePage;
