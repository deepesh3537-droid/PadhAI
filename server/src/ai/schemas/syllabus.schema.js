import { z } from "zod";

/**
 * Zod schema for an individual module in a parsed syllabus.
 */
export const parsedModuleSchema = z.object({
  title: z.string().min(1, "Module title is required"),
  description: z.string().default(""),
  topics: z.array(z.string().min(1)).min(1, "At least one topic per module is required")
});

/**
 * Root Zod schema for structured syllabus extraction.
 * Preserves syllabus hierarchy, extracts prerequisites, and explicitly flags ambiguities.
 * (PRD §6 F1, RULES.md §1 9, TASK-079).
 */
export const syllabusParsedSchema = z.object({
  title: z.string().min(1, "Course/Syllabus title is required"),
  description: z.string().default(""),
  prerequisites: z.array(z.string()).default([]),
  modules: z.array(parsedModuleSchema).min(1, "At least one module or topic section is required"),
  ambiguities: z.array(z.string()).default([]),
  detectedTopicCount: z.number().int().nonnegative().default(0)
});

export default syllabusParsedSchema;
