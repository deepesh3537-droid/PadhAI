import { getSupabaseClient } from "../supabaseAdmin.js";
import { AppError } from "../../utils/errors.js";

/**
 * Fetches all topic mastery records for a user within a specific course.
 *
 * @param {string} userId - User UUID
 * @param {string} courseId - Course UUID
 * @param {string} [token] - User JWT for RLS
 * @returns {Promise<Array>} List of mastery records
 */
export async function findMasteryByUserAndCourse(userId, courseId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("topic_mastery")
    .select("id, user_id, course_id, topic, mastery_score, evidence_count, correct_count, history, last_assessed_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("mastery_score", { ascending: true });

  if (error) {
    throw new AppError(`Failed to fetch topic mastery: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data || [];
}

/**
 * Fetches a single topic mastery entry for a user in a course.
 *
 * @param {string} userId
 * @param {string} courseId
 * @param {string} topic
 * @param {string} [token]
 * @returns {Promise<object|null>}
 */
export async function findMasteryByTopic(userId, courseId, topic, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("topic_mastery")
    .select("id, user_id, course_id, topic, mastery_score, evidence_count, correct_count, history, last_assessed_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("topic", topic)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to fetch topic mastery record: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data;
}

/**
 * Upserts a topic mastery record for a user and course.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.courseId
 * @param {string} params.topic
 * @param {number} params.masteryScore
 * @param {number} params.evidenceCount
 * @param {number} params.correctCount
 * @param {Array} [params.history]
 * @param {string} [params.lastAssessedAt]
 * @param {string} [params.token]
 * @returns {Promise<object>}
 */
export async function upsertTopicMastery(params, secondArgToken) {
  const {
    userId,
    courseId,
    topic,
    masteryScore,
    evidenceCount,
    correctCount,
    history = [],
    lastAssessedAt = new Date().toISOString(),
    token: paramToken
  } = params || {};

  const token = paramToken || secondArgToken;
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("topic_mastery")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        topic,
        mastery_score: masteryScore,
        evidence_count: evidenceCount,
        correct_count: correctCount,
        history,
        last_assessed_at: lastAssessedAt
      },
      { onConflict: "user_id,course_id,topic" }
    )
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to persist topic mastery: ${error.message}`, 500, "DB_WRITE_ERROR");
  }

  return data;
}

/**
 * Fetches all topic mastery records for a user across all enrolled courses.
 *
 * @param {string} userId
 * @param {string} [token]
 * @returns {Promise<Array>}
 */
export async function findAllMasteryByUser(userId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("topic_mastery")
    .select("id, user_id, course_id, topic, mastery_score, evidence_count, correct_count, history, last_assessed_at")
    .eq("user_id", userId)
    .order("last_assessed_at", { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch all mastery records: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data || [];
}

export default {
  findMasteryByUserAndCourse,
  findMasteryByTopic,
  upsertTopicMastery,
  findAllMasteryByUser
};
