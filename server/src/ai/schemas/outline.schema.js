import { z } from "zod";

/**
 * Zod schema for a single lesson in the generated course outline.
 */
export const lessonOutlineSchema = z.object({
  title: z.string().min(1, "Lesson title is required"),
  summary: z.string().min(1, "Lesson summary is required"),
  objectives: z.array(z.string().min(1)).min(1, "At least one learning objective is required")
});

/**
 * Zod schema for a module containing a list of lessons.
 */
export const moduleOutlineSchema = z.object({
  title: z.string().min(1, "Module title is required"),
  description: z.string().default(""),
  lessons: z.array(lessonOutlineSchema).min(1, "At least one lesson per module is required")
});

/**
 * Root Zod schema for the AI-generated course curriculum outline.
 */
export const courseOutlineSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  description: z.string().min(1, "Course description is required"),
  modules: z.array(moduleOutlineSchema).min(1, "At least one module is required")
});

export default courseOutlineSchema;
