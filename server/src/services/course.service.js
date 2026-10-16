import { buildOutlinePrompt, buildOutlineRepairPrompt } from "../ai/prompts/outline.prompt.js";
import { courseOutlineSchema } from "../ai/schemas/outline.schema.js";
import { generateStructured } from "../ai/modelAdapter.js";
import {
  createCourseWithCurriculum,
  findCoursesByUserId,
  findCourseByIdAndUser
} from "../db/repositories/course.repository.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { limits } from "../config/limits.js";

/**
 * Service orchestrating AI curriculum generation and persistent storage.
 */
export async function generateAndSaveCourse({ userId, topic, goal, depth, token }) {
  if (!topic || topic.trim().length === 0) {
    throw new ValidationError("Topic is required");
  }
  if (!goal || goal.trim().length === 0) {
    throw new ValidationError("Goal is required");
  }
  if (!limits.course.allowedDepths.includes(depth)) {
    throw new ValidationError(`Depth must be one of: ${limits.course.allowedDepths.join(", ")}`);
  }

  // 1. Build curriculum generation prompt
  const prompt = buildOutlinePrompt({
    topic: topic.trim(),
    goal: goal.trim(),
    depth
  });

  // 2. Generate structured schema-validated outline from local AI model
  const outline = await generateStructured({
    prompt,
    schema: courseOutlineSchema,
    repairPromptBuilder: buildOutlineRepairPrompt
  });

  // 3. Atomically persist course, modules, and lessons
  const savedCourse = await createCourseWithCurriculum({
    userId,
    goal: goal.trim(),
    depth,
    outline,
    token
  });

  return savedCourse;
}

/**
 * Retrieves all courses for the authenticated user.
 */
export async function getUserCourses(userId, token) {
  return findCoursesByUserId(userId, token);
}

/**
 * Retrieves a single course owned by the user.
 */
export async function getCourseDetails(courseId, userId, token) {
  const course = await findCourseByIdAndUser(courseId, userId, token);
  if (!course) {
    throw new NotFoundError("Course not found or access denied");
  }
  return course;
}

export default {
  generateAndSaveCourse,
  getUserCourses,
  getCourseDetails
};
