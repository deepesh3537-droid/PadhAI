import { getSupabaseClient } from "../supabaseAdmin.js";
import { AppError } from "../../utils/errors.js";

/**
 * Fetches the latest quiz associated with a lesson.
 *
 * @param {string} lessonId - Lesson UUID
 * @param {string} [token] - User JWT for RLS
 * @returns {Promise<Object|null>} Quiz record or null
 */
export async function findQuizByLessonId(lessonId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("quizzes")
    .select("id, lesson_id, title, questions, version, created_at, updated_at")
    .eq("lesson_id", lessonId)
    .order("version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to fetch quiz: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data;
}

/**
 * Fetches a quiz by its primary key ID.
 *
 * @param {string} quizId - Quiz UUID
 * @param {string} [token] - User JWT for RLS
 * @returns {Promise<Object|null>} Quiz record or null
 */
export async function findQuizById(quizId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("quizzes")
    .select("id, lesson_id, title, questions, version, created_at, updated_at")
    .eq("id", quizId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to fetch quiz by ID: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data;
}

/**
 * Creates and persists a new quiz record for a lesson.
 *
 * @param {Object} params
 * @param {string} params.lessonId - Lesson UUID
 * @param {string} params.title - Quiz title
 * @param {Array} params.questions - Validated questions array with answer keys
 * @param {number} [params.version=1] - Version number
 * @param {string} [params.token] - User JWT for RLS
 * @returns {Promise<Object>} Created quiz record
 */
export async function createQuiz({ lessonId, title, questions, version = 1, token }) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("quizzes")
    .insert({
      lesson_id: lessonId,
      title,
      questions,
      version
    })
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to create quiz: ${error.message}`, 500, "DB_WRITE_ERROR");
  }

  return data;
}

/**
 * Fetches lesson details along with module and course context for AI generation & authorization.
 *
 * @param {string} lessonId - Lesson UUID
 * @param {string} [token] - User JWT for RLS
 * @returns {Promise<Object|null>}
 */
export async function findLessonWithContext(lessonId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("lessons")
    .select(`
      id,
      title,
      summary,
      objectives,
      position,
      modules (
        id,
        title,
        courses (
          id,
          user_id,
          title,
          goal,
          target_depth
        )
      )
    `)
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to fetch lesson context: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data;
}

/**
 * Persists a learner's quiz attempt with deterministic score and feedback.
 *
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.quizId - Quiz UUID
 * @param {Object} params.answers - Submitted answers mapping
 * @param {number} params.score - Calculated deterministic score (0-100)
 * @param {Object} params.feedback - Structured feedback object
 * @param {string} [params.token] - User JWT for RLS
 * @returns {Promise<Object>} Created attempt record
 */
export async function createQuizAttempt({ userId, quizId, answers, score, feedback, token }) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      quiz_id: quizId,
      answers,
      score,
      feedback
    })
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to record quiz attempt: ${error.message}`, 500, "DB_WRITE_ERROR");
  }

  return data;
}

/**
 * Fetches historical attempts for a specific quiz by the given user.
 *
 * @param {string} quizId - Quiz UUID
 * @param {string} userId - User UUID
 * @param {string} [token] - User JWT for RLS
 * @returns {Promise<Array>} List of attempts ordered newest first
 */
export async function findAttemptsByQuizAndUser(quizId, userId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("quiz_attempts")
    .select("id, user_id, quiz_id, answers, score, feedback, created_at")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch quiz attempts: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data || [];
}

export default {
  findQuizByLessonId,
  findQuizById,
  createQuiz,
  findLessonWithContext,
  createQuizAttempt,
  findAttemptsByQuizAndUser
};
