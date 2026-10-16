import React, { useState } from "react";

/**
 * Parses a YouTube URL and extracts its 11-character video ID.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 *
 * @param {string} url
 * @returns {string|null} Video ID or null if invalid
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split(/[?&]/)[0] || null;
      }
    }
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split(/[?&]/)[0] || null;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * VideoEmbed Component
 * Aligned with TASK-047, ADR-015, and TEST_PLAN §5:
 * - Uses YouTube IFrame Player embed URL.
 * - Handles playback loading and error states.
 * - Renders a robust fallback card with direct "Watch on YouTube" outbound link when embedding is restricted or unavailable.
 */
export function VideoEmbed({ url, title, author }) {
  const [hasError, setHasError] = useState(false);
  const videoId = extractYouTubeId(url);

  if (!videoId || hasError) {
    return (
      <div
        className="card"
        style={{
          padding: "20px",
          backgroundColor: "#F8FAFC",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "20px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="badge" style={{ backgroundColor: "#FEE2E2", color: "var(--color-danger)", fontSize: "11px" }}>
            Video
          </span>
          <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>
            {title || "Educational Video"}
          </h4>
        </div>
        <p style={{ fontSize: "13px", color: "var(--color-muted)" }}>
          {hasError
            ? "This video could not be embedded directly in the player (creator restrictions or network issue)."
            : "Video link is available for external viewing."}
        </p>
        <div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: "13px", padding: "6px 14px", display: "inline-flex", gap: "6px" }}
          >
            Watch on YouTube ↗
          </a>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&enablejsapi=1`;

  return (
    <div
      style={{
        marginBottom: "24px",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        backgroundColor: "#000",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)"
      }}
    >
      <div
        style={{
          position: "relative",
          paddingBottom: "56.25%", // 16:9 Aspect Ratio
          height: 0,
          overflow: "hidden"
        }}
      >
        <iframe
          src={embedUrl}
          title={title || "YouTube video player"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={() => setHasError(true)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: 0
          }}
        />
      </div>
      {(title || author) && (
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "var(--color-surface)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "var(--color-muted)",
            borderTop: "1px solid var(--color-border)"
          }}
        >
          <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{title}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-primary-strong)", textDecoration: "none" }}
          >
            Open in YouTube ↗
          </a>
        </div>
      )}
    </div>
  );
}

export default VideoEmbed;
