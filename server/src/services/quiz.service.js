import { quizSchema, quizSubmissionSchema, sanitizeQuizForClient } from "../ai/schemas/quiz.schema.js";
import { buildQuizPrompt, buildQuizRepairPrompt } from "../ai/prompts/quiz.prompt.js";
import { generateStructured } from "../ai/modelAdapter.js";
import * as quizRepository from "../db/repositories/quiz.repository.js";
import { AppError, NotFoundError, ValidationError } from "../utils/errors.js";

/**
 * Deterministically computes the score and itemized feedback for a quiz attempt.
 * Pure function: Given the same questions and submitted answers, always returns identical results.
 * (RULES.md / DECISIONS.md ADR-005: Plain code, NEVER an LLM call for scoring).
 *
 * @param {Object} params
 * @param {Array} params.questions - Stored quiz questions with answer keys
 * @param {Object} params.submittedAnswers - Key-value map { [questionId]: chosenIndex }
 * @returns {Object} Deterministic score and feedback breakdown
 */
export function scoreQuizAttempt({ questions, submittedAnswers = {} }) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new ValidationError("Cannot score a quiz without questions");
  }

  let correctCount = 0;
  const questionResults = questions.map((q) => {
    const chosenIndex = submittedAnswers[q.id];
    const isAnswered = typeof chosenIndex === "number";
    const isCorrect = isAnswered && chosenIndex === q.correct_index;

    if (isCorrect) {
      correctCount += 1;
    }

    return {
      questionId: q.id,
      prompt: q.prompt,
      options: q.options,
      chosenIndex: isAnswered ? chosenIndex : null,
      correctIndex: q.correct_index,
      isCorrect,
      explanation: q.explanation,
      mistakeNotes: q.mistake_notes || ""
    };
  });

  const totalQuestions = questions.length;
  const score = Math.round((correctCount / totalQuestions) * 100);

  return {
    score,
    totalQuestions,
    correctCount,
    questionResults
  };
}

/**
 * Retrieves the existing quiz for a lesson or generates and persists a new one via AI.
 *
 * @param {Object} params
 * @param {string} params.lessonId - Lesson UUID
 * @param {string} [params.token] - User JWT
 * @param {boolean} [params.forceRegenerate=false] - Whether to generate a new version
 * @param {Function} [params.generateFn] - Injectable model generation adapter for testing
 * @returns {Promise<Object>} Full stored quiz record (with answer keys)
 */
export async function getOrCreateLessonQuiz({
  lessonId,
  token,
  forceRegenerate = false,
  generateFn
}) {
  if (!lessonId) {
    throw new ValidationError("lessonId is required");
  }

  // 1. Check for existing quiz if not forcing regeneration
  if (!forceRegenerate) {
    const existingQuiz = await quizRepository.findQuizByLessonId(lessonId, token);
    if (existingQuiz) {
      return existingQuiz;
    }
  }

  // 2. Fetch context from lesson, module, and course
  const lessonContext = await quizRepository.findLessonWithContext(lessonId, token);
  if (!lessonContext) {
    throw new NotFoundError(`Lesson ${lessonId} not found`);
  }

  const course = lessonContext.modules?.courses || {};
  const prompt = buildQuizPrompt({
    lessonTitle: lessonContext.title,
    lessonSummary: lessonContext.summary || "",
    objectives: lessonContext.objectives || [],
    courseTopic: course.title || course.goal || lessonContext.title,
    depth: course.target_depth || "beginner"
  });

  // 3. Generate structured quiz with schema validation & bounded repair retries
  const generatedQuiz = await generateStructured({
    prompt,
    schema: quizSchema,
    repairPromptBuilder: buildQuizRepairPrompt,
    ...(generateFn ? { generateFn } : {})
  });

  // 4. Determine version number if a previous quiz existed
  const previousQuiz = await quizRepository.findQuizByLessonId(lessonId, token);
  const version = previousQuiz ? (previousQuiz.version || 1) + 1 : 1;

  // 5. Persist to database
  const created = await quizRepository.createQuiz({
    lessonId,
    title: generatedQuiz.title || `Quiz: ${lessonContext.title}`,
    questions: generatedQuiz.questions,
    version,
    token
  });

  return created;
}

/**
 * Returns a sanitized quiz (without answer keys) along with user attempt history.
 * (SECURITY §28, ARCHITECTURE §219, TEST_PLAN §6).
 *
 * @param {Object} params
 * @param {string} params.lessonId - Lesson UUID
 * @param {string} params.userId - User UUID
 * @param {string} [params.token] - User JWT
 * @param {Function} [params.generateFn] - Injectable generation fn
 * @returns {Promise<Object>} Safe quiz payload and user attempt history
 */
export async function getLessonQuizForLearner({ lessonId, userId, token, generateFn }) {
  const fullQuiz = await getOrCreateLessonQuiz({ lessonId, token, generateFn });
  const attempts = await quizRepository.findAttemptsByQuizAndUser(fullQuiz.id, userId, token);

  return {
    quiz: sanitizeQuizForClient(fullQuiz),
    attempts
  };
}

/**
 * Submits a learner's quiz attempt, calculates deterministic score, and saves the attempt.
 *
 * @param {Object} params
 * @param {string} params.quizId - Quiz UUID
 * @param {string} params.userId - User UUID
 * @param {Object} params.answers - Learner answers { [questionId]: chosenIndex }
 * @param {string} [params.token] - User JWT
 * @returns {Promise<Object>} Attempt record with score and feedback
 */
export async function submitQuizAttempt({ quizId, userId, answers, token }) {
  if (!quizId) {
    throw new ValidationError("quizId is required");
  }
  if (!userId) {
    throw new ValidationError("userId is required");
  }

  // Validate answer payload schema
  const parsed = quizSubmissionSchema.safeParse({ answers });
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((i) => i.message).join(", ")
    );
  }

  // Fetch full quiz with authoritative answer keys
  const quiz = await quizRepository.findQuizById(quizId, token);
  if (!quiz) {
    throw new NotFoundError(`Quiz ${quizId} not found`);
  }

  // Deterministic scoring (plain code)
  const feedback = scoreQuizAttempt({
    questions: quiz.questions,
    submittedAnswers: parsed.data.answers
  });

  // Save attempt to database
  const attempt = await quizRepository.createQuizAttempt({
    userId,
    quizId,
    answers: parsed.data.answers,
    score: feedback.score,
    feedback,
    token
  });

  return attempt;
}

export default {
  scoreQuizAttempt,
  getOrCreateLessonQuiz,
  getLessonQuizForLearner,
  submitQuizAttempt
};
