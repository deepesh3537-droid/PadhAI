import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { LoginPage } from "./routes/LoginPage.jsx";
import { DashboardPage } from "./routes/DashboardPage.jsx";
import { NewCoursePage } from "./routes/NewCoursePage.jsx";
import { CoursePage } from "./routes/CoursePage.jsx";
import { LessonPage } from "./routes/LessonPage.jsx";
import "./styles/index.css";

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard"); // "dashboard" | "new-course" | "course" | "lesson"
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid #E2E8F0", borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>Loading PadhAI...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (currentView === "new-course") {
    return (
      <NewCoursePage
        onCourseCreated={(newCourse) => {
          setSelectedCourse(newCourse);
          setSelectedCourseId(newCourse.id);
          setCurrentView("course");
        }}
        onCancel={() => setCurrentView("dashboard")}
      />
    );
  }

  if (currentView === "lesson" && selectedCourse) {
    return (
      <LessonPage
        course={selectedCourse}
        initialLessonId={selectedLessonId}
        onBackToCourse={() => setCurrentView("course")}
        onSelectLesson={(lesson) => setSelectedLessonId(lesson.id)}
      />
    );
  }

  if (currentView === "course") {
    return (
      <CoursePage
        courseId={selectedCourseId}
        initialCourse={selectedCourse}
        onBack={() => {
          setSelectedCourse(null);
          setSelectedCourseId(null);
          setSelectedLessonId(null);
          setCurrentView("dashboard");
        }}
        onSelectLesson={({ lesson, course: c }) => {
          if (c) setSelectedCourse(c);
          setSelectedLessonId(lesson.id);
          setCurrentView("lesson");
        }}
      />
    );
  }

  return (
    <DashboardPage
      onNavigateToNew={() => setCurrentView("new-course")}
      onSelectCourse={(course) => {
        setSelectedCourse(course);
        setSelectedCourseId(course.id);
        setCurrentView("course");
      }}
    />
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
