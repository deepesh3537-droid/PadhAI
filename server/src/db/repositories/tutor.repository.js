import { getSupabaseClient } from "../supabaseAdmin.js";
import { AppError } from "../../utils/errors.js";

/**
 * Retrieves full course and lesson context needed for course-grounded tutor replies.
 * (PRD §6 F8, ARCHITECTURE §9, TASK-063).
 *
 * @param {string} lessonId - Lesson UUID
 * @param {string} userId - User UUID
 * @param {string} [token] - User JWT for RLS
 * @returns {Promise<Object>} Aggregated lesson, course, resources, quiz attempts, and topic mastery context
 */
export async function getTutorContextForLesson(lessonId, userId, token) {
  const client = getSupabaseClient(token);

  // 1. Fetch Lesson details with Module and Course information
  const { data: lesson, error: lessonError } = await client
    .from("lessons")
    .select(`
      id,
      title,
      summary,
      objectives,
      position,
      module_id,
      modules (
        id,
        title,
        position,
        courses (
          id,
          title,
          goal,
          target_depth
        )
      )
    `)
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    throw new AppError(`Failed to fetch lesson context: ${lessonError.message}`, 500, "DB_QUERY_ERROR");
  }

  if (!lesson) {
    throw new AppError(`Lesson ${lessonId} not found`, 404, "NOT_FOUND");
  }

  const courseId = lesson.modules?.courses?.id;

  // 2. Fetch full course curriculum outline (all modules & lessons)
  const { data: allModules } = await client
    .from("modules")
    .select(`
      id,
      title,
      position,
      lessons (
        id,
        title,
        position
      )
    `)
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  // 3. Fetch lesson educational resources
  const { data: resources } = await client
    .from("resources")
    .select("id, title, url, type, summary, relevance_score")
    .eq("lesson_id", lessonId)
    .order("relevance_score", { ascending: false })
    .limit(5);

  // 4. Fetch recent quiz attempts by this user for quizzes in this lesson
  const { data: quizzes } = await client
    .from("quizzes")
    .select("id, title")
    .eq("lesson_id", lessonId);

  let recentAttempts = [];
  if (quizzes && quizzes.length > 0) {
    const quizIds = quizzes.map((q) => q.id);
    const { data: attempts } = await client
      .from("quiz_attempts")
      .select("id, quiz_id, score, feedback, created_at")
      .in("quiz_id", quizIds)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    recentAttempts = attempts || [];
  }

  // 5. Fetch topic mastery records for this user in this course
  const { data: topicMastery } = await client
    .from("topic_mastery")
    .select("topic, mastery_score, evidence_count, correct_count")
    .eq("user_id", userId)
    .eq("course_id", courseId);

  // 6. Fetch previous tutor messages for this lesson session
  const { data: messages } = await client
    .from("tutor_messages")
    .select("id, role, content, sources, beyond_course, created_at")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true })
    .limit(20);

  return {
    course: lesson.modules?.courses || null,
    module: { id: lesson.modules?.id, title: lesson.modules?.title },
    lesson: {
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      objectives: lesson.objectives || []
    },
    outline: allModules || [],
    resources: resources || [],
    recentAttempts,
    topicMastery: topicMastery || [],
    conversationHistory: messages || []
  };
}

/**
 * Saves a new tutor message (user query or assistant response) to the database.
 * (PRD §6 F8, ARCHITECTURE §9).
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.courseId
 * @param {string} params.lessonId
 * @param {'user'|'assistant'} params.role
 * @param {string} params.content
 * @param {Array} [params.sources=[]]
 * @param {boolean} [params.beyondCourse=false]
 * @param {string} [params.token]
 * @returns {Promise<Object>} Created message record
 */
export async function saveTutorMessage(params, secondArgToken) {
  const {
    userId,
    courseId,
    lessonId,
    role,
    content,
    sources = [],
    beyondCourse = false,
    token: paramToken
  } = params || {};

  const token = paramToken || secondArgToken;
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("tutor_messages")
    .insert({
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      role,
      content,
      sources,
      beyond_course: beyondCourse
    })
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to save tutor message: ${error.message}`, 500, "DB_WRITE_ERROR");
  }

  return data;
}

/**
 * Retrieves tutor message history for a given lesson.
 *
 * @param {string} lessonId
 * @param {string} userId
 * @param {string} [token]
 * @returns {Promise<Array>}
 */
export async function getLessonTutorMessages(lessonId, userId, token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from("tutor_messages")
    .select("id, role, content, sources, beyond_course, created_at")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new AppError(`Failed to fetch tutor messages: ${error.message}`, 500, "DB_QUERY_ERROR");
  }

  return data || [];
}

export default {
  getTutorContextForLesson,
  saveTutorMessage,
  getLessonTutorMessages
};
