/**
 * Prompts for Syllabus Parsing and Syllabus-to-Course Generation
 * Aligned with TASK-079, TASK-080, PRD §6 F1, and RULES.md §1 9:
 * - "Preserve syllabus structure; flag ambiguities; never invent topics."
 */

/**
 * Builds the prompt to parse raw extracted syllabus text into structured modules and topics.
 *
 * @param {string} extractedText Cleaned, bounded text extracted from the uploaded document
 * @returns {string} Prompt string
 */
export function buildSyllabusParsePrompt(extractedText) {
  return `You are an expert academic syllabus analyzer.
Analyze the following extracted syllabus text and convert it into structured modules and topics.

CRITICAL INSTRUCTIONS:
1. STRICT STRUCTURAL PRESERVATION: Identify any Course Title, Course Overview, Units, Modules, Weeks, or Chapters. Preserve their original hierarchy and sequence.
2. NEVER INVENT TOPICS: You must strictly extract only what is written in the text. Do NOT add outside subjects, frameworks, technologies, or chapters that are not in the syllabus.
3. DETECT AMBIGUITIES: If a topic is vague (e.g. "Advanced Concepts" with no details), or if a unit has no listed sub-topics, or if the syllabus is unstructured, record a clear note in the "ambiguities" array.
4. Output strictly valid JSON with the following structure:
{
  "title": "Course Title from syllabus",
  "description": "Brief course description or summary from syllabus",
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
  "modules": [
    {
      "title": "Module/Unit 1 Title",
      "description": "Module overview",
      "topics": ["Specific topic 1", "Specific topic 2"]
    }
  ],
  "ambiguities": ["Note about any vague or incomplete sections"],
  "detectedTopicCount": 5
}

--- RAW SYLLABUS TEXT ---
${extractedText}
--- END RAW SYLLABUS TEXT ---`;
}

/**
 * Builds the prompt to generate a full curriculum outline from a parsed syllabus.
 *
 * @param {object} params
 * @param {object} params.parsedSyllabus
 * @param {string} [params.goal]
 * @param {string} [params.depth]
 * @returns {string} Prompt string
 */
export function buildCourseFromSyllabusPrompt({ parsedSyllabus, goal = "", depth = "beginner" }) {
  const modulesSummary = (parsedSyllabus.modules || [])
    .map((m, idx) => `Module ${idx + 1}: ${m.title}\nTopics: ${(m.topics || []).join(", ")}`)
    .join("\n\n");

  return `You are an expert curriculum designer.
Generate a structured course curriculum outline strictly derived from the approved syllabus below.

LEARNER PREFERENCES:
- Target Depth: ${depth}
- Goal: ${goal || "Master the concepts in the syllabus"}

CRITICAL CONSTRAINTS:
1. STRICT SYLLABUS FIDELITY: Every module and lesson MUST directly correspond to the modules and topics in the syllabus.
2. NEVER INVENT TOPICS: Do NOT add outside modules, technologies, or speculative lessons that were not in the syllabus.
3. CONCRETE OBJECTIVES: For each lesson, provide 2 to 4 concrete, measurable learning objectives derived from the syllabus topics.
4. Output strictly valid JSON matching the following schema:
{
  "title": "${parsedSyllabus.title || "Course Title"}",
  "description": "${parsedSyllabus.description || "Course Overview"}",
  "modules": [
    {
      "title": "Module Title",
      "description": "Brief module summary",
      "lessons": [
        {
          "title": "Lesson Title (matching syllabus topic)",
          "summary": "Clear explanation of what the lesson covers",
          "objectives": [
            "Measurable objective 1",
            "Measurable objective 2"
          ]
        }
      ]
    }
  ]
}

--- APPROVED SYLLABUS STRUCTURE ---
Title: ${parsedSyllabus.title}
Overview: ${parsedSyllabus.description}
Prerequisites: ${(parsedSyllabus.prerequisites || []).join(", ") || "None specified"}

${modulesSummary}
--- END APPROVED SYLLABUS STRUCTURE ---`;
}

export default {
  buildSyllabusParsePrompt,
  buildCourseFromSyllabusPrompt
};
