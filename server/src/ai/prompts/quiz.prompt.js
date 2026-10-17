/**
 * Builds the prompt instructing the local LLM to generate a structured lesson quiz.
 *
 * @param {Object} params
 * @param {string} params.lessonTitle - Title of the lesson
 * @param {string} [params.lessonSummary] - Summary of the lesson
 * @param {string[]} [params.objectives] - List of learning objectives
 * @param {string} [params.courseTopic] - Overall topic of the course
 * @param {string} [params.depth] - Target depth ('beginner', 'intermediate', 'advanced')
 * @returns {string} Formatted prompt string
 */
export function buildQuizPrompt({
  lessonTitle,
  lessonSummary = "",
  objectives = [],
  courseTopic = "",
  depth = "beginner"
}) {
  const objectivesText =
    objectives.length > 0
      ? objectives.map((o, idx) => `  ${idx + 1}. ${o}`).join("\n")
      : "  1. Understand core concepts of the lesson.";

  return `You are an expert educational assessment designer. Generate a structured, high-quality multiple choice quiz to test a learner's comprehension of the following lesson:

- Course Topic: "${courseTopic || lessonTitle}"
- Target Depth: "${depth}" (beginner, intermediate, or advanced)
- Lesson Title: "${lessonTitle}"
- Lesson Summary: "${lessonSummary}"
- Learning Objectives:
${objectivesText}

Requirements:
1. Generate between 3 and 5 high-quality conceptual or scenario-based multiple choice questions. YOU MUST GENERATE AT LEAST 3 QUESTIONS. DO NOT STOP AFTER 1 QUESTION.
2. Each question MUST have exactly 4 plausible choices in the "options" array.
3. "correct_index" MUST be an integer from 0 to 3 specifying the exact index of the single correct answer in "options".
4. "explanation" MUST clearly explain why the correct answer is right.
5. "mistake_notes" should concisely explain common misconceptions or why the distractor options are incorrect.
6. Each question MUST have a unique "id" ("q1", "q2", "q3", etc.).
7. Output MUST be strictly valid JSON containing at least 3 question objects in the "questions" array, matching this schema:
{
  "title": "Quiz: ${lessonTitle}",
  "questions": [
    {
      "id": "q1",
      "prompt": "First question testing concept 1?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Detailed explanation of why Option A is correct.",
      "mistake_notes": "Common misconceptions regarding the other choices."
    },
    {
      "id": "q2",
      "prompt": "Second question testing concept 2?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 1,
      "explanation": "Detailed explanation of why Option B is correct.",
      "mistake_notes": "Common misconceptions regarding the other choices."
    },
    {
      "id": "q3",
      "prompt": "Third question testing concept 3?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 2,
      "explanation": "Detailed explanation of why Option C is correct.",
      "mistake_notes": "Common misconceptions regarding the other choices."
    }
  ]
}

Return ONLY the raw JSON object. Do not include markdown code fences or conversational text outside the JSON.`;
}

/**
 * Builds a repair prompt when previous model output failed schema validation.
 *
 * @param {Object} params
 * @param {string} params.originalPrompt - The original prompt given to the model
 * @param {string} params.rawOutput - The raw output from the model
 * @param {string} params.errorMessages - Validation or parse failure details
 * @returns {string} Repair prompt
 */
export function buildQuizRepairPrompt({ originalPrompt, rawOutput, errorMessages }) {
  return `${originalPrompt}

Your previous output failed validation with the following errors:
${errorMessages}

Previous output was:
${rawOutput.slice(0, 500)}

Please fix the errors and output ONLY a valid JSON object matching the requested schema.
Ensure that:
1. The "questions" array contains AT LEAST 3 distinct questions (q1, q2, q3).
2. Each question has exactly 4 options.
3. "correct_index" is an integer between 0 and 3.`;
}

export default {
  buildQuizPrompt,
  buildQuizRepairPrompt
};
