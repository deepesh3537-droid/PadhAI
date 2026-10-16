import React from "react";

export function ProgressBar({ percent = 0, label, height = 8 }) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px", color: "var(--color-muted)", fontWeight: 500 }}>
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: `${height}px`,
          backgroundColor: "#E2E8F0",
          borderRadius: "9999px",
          overflow: "hidden"
        }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            backgroundColor: clamped === 100 ? "var(--color-success)" : "var(--color-primary)",
            borderRadius: "9999px",
            transition: "width 0.3s ease"
          }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
