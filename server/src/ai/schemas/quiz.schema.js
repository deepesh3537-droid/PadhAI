import { z } from "zod";

/**
 * Zod schema for an individual quiz question.
 * Enforces answer key alignment: correct_index must point to a valid option.
 */
export const quizQuestionSchema = z.preprocess(
  (val) => {
    if (!val || typeof val !== "object") return val;
    const obj = { ...val };
    // Tolerant field mapping for small local LLMs
    if (!obj.prompt && obj.question) obj.prompt = obj.question;
    if (obj.correct_index === undefined && obj.correctIndex !== undefined) obj.correct_index = obj.correctIndex;
    if (obj.correct_index === undefined && typeof obj.answer === "number") obj.correct_index = obj.answer;
    if (!obj.id) obj.id = `q_${Math.random().toString(36).slice(2, 7)}`;
    if (!obj.explanation) obj.explanation = "Review the lesson materials for further explanation.";
    return obj;
  },
  z
    .object({
      id: z.string().min(1, "Question ID is required"),
      prompt: z.string().min(3, "Question prompt must be at least 3 characters"),
      options: z
        .array(z.string().min(1, "Option text cannot be empty"))
        .min(2, "At least 2 options are required")
        .max(6, "At most 6 options are allowed"),
      correct_index: z
        .number({ required_error: "correct_index is required" })
        .int("correct_index must be an integer")
        .min(0, "correct_index must be >= 0"),
      explanation: z.string().default("Review the lesson materials for further explanation."),
      mistake_notes: z.string().optional().default("")
    })
    .refine(
      (question) => question.correct_index < question.options.length,
      {
        message: "Answer key (correct_index) does not match any option",
        path: ["correct_index"]
      }
    )
);

/**
 * Root Zod schema for a full lesson quiz.
 * Enforces a minimum of 3 questions and maximum of 6 questions.
 */
export const quizSchema = z.preprocess(
  (val) => {
    // If model outputs array directly: [ { ... }, { ... } ]
    if (Array.isArray(val)) {
      return { title: "Lesson Quiz", questions: val };
    }
    if (val && typeof val === "object" && !val.title) {
      return { ...val, title: "Lesson Quiz" };
    }
    return val;
  },
  z.object({
    title: z.string().default("Lesson Quiz"),
    questions: z
      .array(quizQuestionSchema)
      .min(3, "At least 3 questions are required per quiz")
      .max(6, "At most 6 questions per quiz")
  })
);

/**
 * Zod schema validating a learner's submitted quiz answers.
 * Maps question ID to chosen option index.
 */
export const quizSubmissionSchema = z.object({
  answers: z
    .record(z.string(), z.number().int().min(0))
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one answered question is required"
    })
});

/**
 * Strips confidential answer keys and explanations from questions
 * before returning quiz data to learners (SECURITY §28, ARCHITECTURE §219, TEST_PLAN §6).
 *
 * @param {Object} quiz - Stored database quiz object
 * @returns {Object} Public-safe quiz payload
 */
export function sanitizeQuizForClient(quiz) {
  if (!quiz) return null;
  return {
    id: quiz.id,
    lesson_id: quiz.lesson_id,
    title: quiz.title,
    version: quiz.version,
    created_at: quiz.created_at,
    questions: (quiz.questions || []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options
      // Explicitly omit correct_index, explanation, mistake_notes
    }))
  };
}

export default {
  quizQuestionSchema,
  quizSchema,
  quizSubmissionSchema,
  sanitizeQuizForClient
};
