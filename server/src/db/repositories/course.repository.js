import { getSupabaseClient } from "../supabaseAdmin.js";
import { AppError } from "../../utils/errors.js";

/**
 * Persists a generated course, its modules, and lessons into PostgreSQL.
 */
export async function createCourseWithCurriculum({ userId, goal, depth, outline, token }) {
  const client = getSupabaseClient(token);

  // 1. Insert course record
  const { data: course, error: courseError } = await client
    .from("courses")
    .insert({
      user_id: userId,
      title: outline.title,
      description: outline.description,
      goal,
      target_depth: depth,
      status: "ready"
    })
    .select()
    .single();

  if (courseError) {
    throw new AppError(`Failed to save course: ${courseError.message}`, 500, "DB_WRITE_ERROR");
  }

  // 2. Insert modules and lessons sequentially with atomic rollback on failure
  try {
    for (let mIdx = 0; mIdx < outline.modules.length; mIdx++) {
      const mod = outline.modules[mIdx];
      const { data: moduleData, error: modError } = await client
        .from("modules")
        .insert({
          course_id: course.id,
          title: mod.title,
          description: mod.description || "",
          position: mIdx
        })
        .select()
        .single();

      if (modError) {
        throw new AppError(`Failed to save module: ${modError.message}`, 500, "DB_WRITE_ERROR");
      }

      if (mod.lessons && mod.lessons.length > 0) {
        const lessonsToInsert = mod.lessons.map((lesson, lIdx) => ({
          module_id: moduleData.id,
          title: lesson.title,
          summary: lesson.summary || "",
          objectives: lesson.objectives || [],
          position: lIdx
        }));

        const { error: lessonError } = await client
          .from("lessons")
          .insert(lessonsToInsert);

        if (lessonError) {
          throw new AppError(`Failed to save lessons: ${lessonError.message}`, 500, "DB_WRITE_ERROR");
        }
      }
    }
  } catch (err) {
    // Atomic rollback: clean up the course record (CASCADE removes any partial modules/lessons)
    await client.from("courses").delete().eq("id", course.id);
    throw err;
  }

  // 3. Return complete course hierarchy
  return findCourseByIdAndUser(course.id, userId, token);
}

/**
 * Fetches all courses owned by the user.
 */
export async function findCoursesByUserId(userId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("courses")
    .select("id, user_id, title, description, goal, target_depth, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch user courses: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data || [];
}

/**
 * Fetches a single course with nested modules and lessons, verifying user ownership.
 */
export async function findCourseByIdAndUser(courseId, userId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("courses")
    .select(`
      id,
      user_id,
      title,
      description,
      goal,
      target_depth,
      status,
      created_at,
      updated_at,
      modules (
        id,
        title,
        description,
        position,
        lessons (
          id,
          title,
          summary,
          objectives,
          position,
          metadata
        )
      )
    `)
    .eq("id", courseId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  // Sort modules and lessons by position
  if (data.modules) {
    data.modules.sort((a, b) => a.position - b.position);
    data.modules.forEach((mod) => {
      if (mod.lessons) {
        mod.lessons.sort((a, b) => a.position - b.position);
      }
    });
  }

  return data;
}

/**
 * Updates a lesson's metadata (e.g., coverage gaps or evaluation results).
 *
 * @param {string} lessonId
 * @param {object} metadata
 * @param {string} [token]
 * @returns {Promise<object>}
 */
export async function updateLessonMetadata(lessonId, metadata, token) {
  const { getSupabaseClient, supabaseServer } = await import("../supabaseAdmin.js");
  const client = token ? getSupabaseClient(token) : supabaseServer;

  const { data, error } = await client
    .from("lessons")
    .update({ metadata })
    .eq("id", lessonId)
    .select()
    .single();

  if (error) {
    console.warn(`[CourseRepository] Failed to update lesson metadata for ${lessonId}:`, error.message);
    return null;
  }

  return data;
}

export default {
  createCourseWithCurriculum,
  findCoursesByUserId,
  findCourseByIdAndUser,
  updateLessonMetadata
};
