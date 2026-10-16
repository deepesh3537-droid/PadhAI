import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { LoginPage } from "./routes/LoginPage.jsx";
import { DashboardPage } from "./routes/DashboardPage.jsx";
import "./styles/index.css";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid #E2E8F0", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Loading PadhAI...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return user ? <DashboardPage /> : <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
