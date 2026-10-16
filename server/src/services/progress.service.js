import { completeLesson, findCompletedLessonsByUser } from "../db/repositories/progress.repository.js";
import { ValidationError } from "../utils/errors.js";

/**
 * Service to manage learner lesson progress and completion state.
 */
export async function markLessonCompleted({ userId, lessonId, token }) {
  if (!lessonId) {
    throw new ValidationError("lessonId is required");
  }
  return completeLesson(userId, lessonId, token);
}

/**
 * Calculates completion metrics for a course outline.
 */
export async function getCourseProgress({ userId, course, token }) {
  const allLessons = [];
  if (course?.modules) {
    course.modules.forEach((mod) => {
      if (mod.lessons) {
        allLessons.push(...mod.lessons);
      }
    });
  }

  const totalLessons = allLessons.length;
  if (totalLessons === 0) {
    return {
      totalLessons: 0,
      completedCount: 0,
      percentCompleted: 0,
      completedLessonIds: []
    };
  }

  const lessonIds = allLessons.map((l) => l.id).filter(Boolean);
  const completedRecords = await findCompletedLessonsByUser(userId, lessonIds, token);
  const completedLessonIds = completedRecords.map((r) => r.lesson_id);
  const completedCount = completedLessonIds.length;
  const percentCompleted = Math.round((completedCount / totalLessons) * 100);

  return {
    totalLessons,
    completedCount,
    percentCompleted,
    completedLessonIds
  };
}

export default {
  markLessonCompleted,
  getCourseProgress
};
