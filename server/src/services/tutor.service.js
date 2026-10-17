import * as tutorRepository from "../db/repositories/tutor.repository.js";
import { buildTutorPrompt } from "../ai/prompts/tutor.prompt.js";
import { ollamaGenerate } from "../ai/ollamaAdapter.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

/**
 * Service orchestrating AI tutor inquiries, context retrieval, source attribution,
 * and conversational persistence.
 * (PRD §6 F8, ADR-011, ARCHITECTURE §9, TASK-063, TASK-064).
 *
 * @param {Object} params
 * @param {string} params.lessonId - Lesson UUID
 * @param {string} params.userId - User UUID
 * @param {string} params.message - Learner's query text
 * @param {string} [params.token] - User JWT for RLS
 * @param {Function} [params.generateFn] - Injectable model adapter for testing
 * @returns {Promise<Object>} Assistant response with citations and fallback flag
 */
export async function sendTutorMessage({
  lessonId,
  userId,
  message,
  token,
  generateFn = ollamaGenerate
}) {
  if (!lessonId) {
    throw new ValidationError("lessonId is required");
  }
  if (!userId) {
    throw new ValidationError("userId is required");
  }
  if (!message || message.trim().length === 0) {
    throw new ValidationError("Message cannot be empty");
  }
  if (message.length > 2000) {
    throw new ValidationError("Message exceeds maximum length of 2000 characters");
  }

  // 1. Retrieve full SQL context: lesson, outline, quiz attempts, mastery, history (TASK-063)
  const context = await tutorRepository.getTutorContextForLesson(lessonId, userId, token);
  if (!context || !context.lesson) {
    throw new NotFoundError(`Lesson ${lessonId} not found`);
  }

  const courseId = context.course?.id;

  // 2. Persist learner message to conversation history
  await tutorRepository.saveTutorMessage({
    userId,
    courseId,
    lessonId,
    role: "user",
    content: message.trim(),
    sources: [],
    beyondCourse: false,
    token
  });

  // 3. Construct course-grounded prompt (TASK-064)
  const prompt = buildTutorPrompt({
    context,
    userMessage: message.trim(),
    history: context.conversationHistory
  });

  // 4. Generate AI tutor reply
  let replyText = "";
  try {
    replyText = await generateFn({
      prompt,
      format: "" // natural markdown text
    });
  } catch (err) {
    // If model fails or unreachable, fallback cleanly
    replyText = "I'm having a little trouble connecting to my local knowledge base right now. Please try asking again in a moment, or review the lesson materials and resources listed above!";
  }

  if (!replyText || replyText.trim().length === 0) {
    replyText = "I could not formulate an answer at this time. Please try rephrasing your question.";
  }

  // 5. Evaluate if response went beyond course materials (PRD §6 F8, ADR-011)
  const beyondCourseMatch = /beyond\s+(your\s+)?course\s+materials/i.test(replyText);
  let cleanedContent = replyText.trim();
  let beyondCourse = beyondCourseMatch;

  // 6. Assemble source citations
  const sources = [];

  // If grounded in course, cite current lesson
  if (!beyondCourse) {
    sources.push({
      type: "lesson",
      title: context.lesson.title,
      id: context.lesson.id
    });
  }

  // Check which resources were referenced
  for (const res of context.resources || []) {
    // Look for "[Source N]" or URL or resource title in reply
    const escapedTitle = res.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const titleRegex = new RegExp(escapedTitle, "i");
    if (titleRegex.test(replyText) || /\[Source\s+\d+\]/i.test(replyText)) {
      sources.push({
        type: "resource",
        title: res.title,
        url: res.url
      });
      break;
    }
  }

  // 7. Persist assistant reply to database
  const assistantMsg = await tutorRepository.saveTutorMessage({
    userId,
    courseId,
    lessonId,
    role: "assistant",
    content: cleanedContent,
    sources,
    beyondCourse,
    token
  });

  return assistantMsg;
}

/**
 * Retrieves full conversation history between learner and tutor for a lesson.
 *
 * @param {Object} params
 * @param {string} params.lessonId
 * @param {string} params.userId
 * @param {string} [params.token]
 * @returns {Promise<Array>}
 */
export async function getLessonTutorHistory({ lessonId, userId, token }) {
  if (!lessonId) throw new ValidationError("lessonId is required");
  if (!userId) throw new ValidationError("userId is required");

  return tutorRepository.getLessonTutorMessages(lessonId, userId, token);
}

export default {
  sendTutorMessage,
  getLessonTutorHistory
};
