import { getSupabaseClient } from "../supabaseAdmin.js";
import { AppError } from "../../utils/errors.js";

/**
 * Idempotently marks a lesson as completed for a given user.
 */
export async function completeLesson(userId, lessonId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("lesson_progress")
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString()
      },
      { onConflict: "user_id,lesson_id" }
    )
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to mark lesson complete: ${error.message}`, 500, "DB_WRITE_ERROR");
  }

  return data;
}

/**
 * Fetches all completed lesson IDs for a user across a set of lesson IDs.
 */
export async function findCompletedLessonsByUser(userId, lessonIds = [], token) {
  const client = getSupabaseClient(token);
  let query = client
    .from("lesson_progress")
    .select("lesson_id, completed_at")
    .eq("user_id", userId);

  if (lessonIds.length > 0) {
    query = query.in("lesson_id", lessonIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to fetch lesson progress: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data || [];
}

export default {
  completeLesson,
  findCompletedLessonsByUser
};
