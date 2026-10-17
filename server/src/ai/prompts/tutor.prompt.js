/**
 * Builds course-grounded prompt for the AI tutor with SQL-retrieved context,
 * recent quiz attempts, topic mastery evidence, and source citations.
 * (PRD §6 F8, ADR-011, ARCHITECTURE §9, TEST_PLAN §8).
 */
export function buildTutorPrompt({
  context,
  userMessage,
  history = []
}) {
  const {
    course,
    module,
    lesson,
    outline,
    resources,
    recentAttempts,
    topicMastery
  } = context;

  // Format curriculum outline
  const outlineSummary = (outline || [])
    .map((m, mIdx) => {
      const lessons = (m.lessons || []).map((l, lIdx) => `    ${mIdx + 1}.${lIdx + 1} ${l.title}`).join("\n");
      return `Module ${mIdx + 1}: ${m.title}\n${lessons}`;
    })
    .join("\n\n");

  // Format resources
  const resourceSummary = (resources || [])
    .map((r, idx) => `[Source ${idx + 1}] "${r.title}" (${r.type}): ${r.url} - ${r.summary || "Core lesson resource"}`)
    .join("\n");

  // Format learner mastery & quiz context
  const masterySummary = (topicMastery || [])
    .map((m) => `Topic "${m.topic}": ${m.mastery_score}% mastery (${m.evidence_count} answers recorded)`)
    .join("; ") || "No prior quiz answers recorded yet.";

  const recentQuizSummary = (recentAttempts || [])
    .slice(0, 2)
    .map((att, idx) => {
      const score = att.score;
      const mistakes = (att.feedback?.questionResults || [])
        .filter((q) => !q.isCorrect)
        .map((q) => `Missed question: "${q.prompt}"`)
        .join("; ");
      return `Attempt ${idx + 1}: Score ${score}%${mistakes ? ` (${mistakes})` : ""}`;
    })
    .join(" | ") || "No attempts yet on this lesson.";

  // Format conversation history
  const formattedHistory = (history || [])
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Learner" : "Tutor"}: ${m.content}`)
    .join("\n");

  const prompt = `You are the PadhAI AI Tutor, an encouraging, patient, and knowledgeable educational tutor.
You are helping a learner study their course.

=== COURSE & LESSON CONTEXT ===
Course: "${course?.title || "Educational Course"}" (Depth: ${course?.target_depth || "Beginner"})
Goal: "${course?.goal || "Master the fundamentals"}"
Current Module: "${module?.title || "Current Module"}"
Current Lesson: "${lesson?.title || "Current Lesson"}"
Lesson Objectives:
${(lesson?.objectives || []).map((obj) => `- ${obj}`).join("\n") || "- Understand the core concepts."}

Lesson Summary:
${lesson?.summary || "No summary provided."}

Curriculum Outline:
${outlineSummary || "Standard course structure."}

Available Educational Resources:
${resourceSummary || "No external resources listed."}

=== LEARNER'S CURRENT BACKGROUND ===
Topic Mastery: ${masterySummary}
Recent Lesson Quiz Performance: ${recentQuizSummary}

=== GROUNDING & CITATION RULES ===
1. COURSE-FIRST: Ground your explanations primarily in the current lesson and course context above.
2. CITATIONS: When your answer is supported by the lesson or listed resources, reference the lesson title or "[Source N]".
3. BEYOND COURSE MATERIAL LABEL: If the learner asks about a concept or detail NOT covered in this lesson or course curriculum, you may still answer helpfully, BUT you MUST explicitly include the phrase "Beyond your course materials:" at the start of that explanation.
4. TONE & PEDAGOGY:
   - If the learner recently struggled with a quiz question, offer intuitive, step-by-step guidance.
   - Use clear examples and analogies.
   - Keep answers structured, engaging, and under 300 words unless deep detail was requested.

=== RECENT CHAT HISTORY ===
${formattedHistory ? formattedHistory + "\n" : "(Start of conversation)\n"}
Learner: ${userMessage}
Tutor:`;

  return prompt;
}

export default {
  buildTutorPrompt
};
