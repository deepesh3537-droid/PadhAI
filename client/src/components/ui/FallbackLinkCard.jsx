import React from "react";

/**
 * FallbackLinkCard Component
 * Aligned with TASK-048, TASK-049, ADR-014, and ADR-015:
 * - Renders non-embeddable sites, official documentation, articles, and PDFs.
 * - For PDFs: offers clear document indicator and direct link out (or browser preview).
 * - Opens all third-party outbound links securely in new tab with rel="noopener noreferrer".
 */
export function FallbackLinkCard({ resource }) {
  if (!resource) return null;

  const isPdf =
    resource.resource_type === "pdf" ||
    (resource.url && resource.url.toLowerCase().endsWith(".pdf"));

  const badgeColorMap = {
    article: { bg: "#EEF2FF", text: "#4F46E5" },
    documentation: { bg: "#ECFDF5", text: "#059669" },
    pdf: { bg: "#FEF3C7", text: "#D97706" },
    video: { bg: "#FEE2E2", text: "#DC2626" },
    interactive: { bg: "#F3E8FF", text: "#7E22CE" }
  };

  const badgeStyle = badgeColorMap[resource.resource_type] || {
    bg: "#F1F5F9",
    text: "var(--color-muted)"
  };

  return (
    <div
      className="card"
      style={{
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease"
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
          <span
            className="badge"
            style={{
              backgroundColor: badgeStyle.bg,
              color: badgeStyle.text,
              fontSize: "11px",
              textTransform: "uppercase",
              fontWeight: 600,
              padding: "2px 8px"
            }}
          >
            {isPdf ? "PDF Document" : resource.resource_type || "Resource"}
          </span>

          {resource.access_status && (
            <span
              style={{
                fontSize: "11px",
                color: resource.access_status === "accessible" ? "var(--color-success)" : "var(--color-warning)",
                fontWeight: 500
              }}
            >
              ● {resource.access_status}
            </span>
          )}
        </div>

        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--color-primary-strong)",
            textDecoration: "none",
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
          title={resource.title}
        >
          {resource.title}
        </a>

        {resource.relevance_evidence?.wrappedSummary && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-muted)",
              marginTop: "4px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}
          >
            {resource.relevance_evidence.wrappedSummary}
          </p>
        )}

        <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--color-muted)", marginTop: "6px" }}>
          {resource.author && (
            <span>
              Source: <strong>{resource.author}</strong>
            </span>
          )}
          {isPdf && <span>Format: <strong>PDF</strong></span>}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ fontSize: "13px", padding: "8px 14px", display: "inline-flex", gap: "6px" }}
        >
          {isPdf ? "View PDF ↗" : "Open Link ↗"}
        </a>
      </div>
    </div>
  );
}

export default FallbackLinkCard;
