/**
 * Builds the prompt instructing the local LLM to generate a structured course outline.
 */
export function buildOutlinePrompt({ topic, goal, depth }) {
  return `You are an expert curriculum designer. Generate a structured, comprehensive course curriculum for a learner with the following parameters:

- Topic: "${topic}"
- Learner Goal: "${goal}"
- Target Depth: "${depth}" (beginner, intermediate, or advanced)

Requirements:
1. Divide the course into 2 to 4 logical modules.
2. Each module must contain 2 to 4 distinct lessons arranged in logical learning progression.
3. Each lesson must have a concise summary and 2 to 4 measurable, clear learning objectives.
4. Output MUST be strictly valid JSON matching this schema:
{
  "title": "string",
  "description": "string",
  "modules": [
    {
      "title": "string",
      "description": "string",
      "lessons": [
        {
          "title": "string",
          "summary": "string",
          "objectives": ["string"]
        }
      ]
    }
  ]
}

Return ONLY the raw JSON object. Do not include markdown formatting or commentary outside the JSON.`;
}

/**
 * Builds a repair prompt when previous model output failed schema validation.
 */
export function buildOutlineRepairPrompt({ originalPrompt, rawOutput, errorMessages }) {
  return `${originalPrompt}

Your previous output failed validation with the following errors:
${errorMessages}

Previous output was:
${rawOutput.slice(0, 500)}

Please correct the issues and output ONLY a valid JSON object matching the requested schema.`;
}

export default {
  buildOutlinePrompt,
  buildOutlineRepairPrompt
};
