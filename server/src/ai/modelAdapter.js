import { limits } from "../config/limits.js";
import { AiError } from "../utils/errors.js";
import { ollamaGenerate } from "./ollamaAdapter.js";

/**
 * Cleans markdown code blocks (```json ... ```) or whitespace from raw LLM output.
 */
function cleanJsonOutput(raw) {
  if (!raw) return "";
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Executes structured generation with Zod validation and bounded repair retries.
 *
 * @param {Object} options
 * @param {string} options.prompt - Initial prompt
 * @param {import("zod").ZodSchema} options.schema - Target Zod schema
 * @param {Function} [options.repairPromptBuilder] - Builder function for repair prompts
 * @param {Function} [options.generateFn] - Injectable generation adapter (defaults to Ollama)
 * @returns {Promise<any>} Schema-validated object
 */
export async function generateStructured({
  prompt,
  schema,
  repairPromptBuilder,
  generateFn = ollamaGenerate
}) {
  const maxRetries = limits.ai.maxRetries;
  let currentPrompt = prompt;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const rawOutput = await generateFn({ prompt: currentPrompt });
    const cleaned = cleanJsonOutput(rawOutput);

    let parsedJson;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (parseErr) {
      lastError = `JSON parse failed: ${parseErr.message}`;
      if (attempt < maxRetries && repairPromptBuilder) {
        currentPrompt = repairPromptBuilder({
          originalPrompt: prompt,
          rawOutput,
          errorMessages: lastError
        });
        continue;
      }
      throw new AiError(
        "AI output could not be parsed as valid JSON after retries",
        "AI_INVALID_OUTPUT",
        { rawOutput: rawOutput.slice(0, 500), error: lastError }
      );
    }

    const validation = schema.safeParse(parsedJson);
    if (validation.success) {
      return validation.data;
    }

    const errorDetails = validation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    lastError = `Schema validation failed: ${errorDetails}`;

    if (attempt < maxRetries && repairPromptBuilder) {
      currentPrompt = repairPromptBuilder({
        originalPrompt: prompt,
        rawOutput,
        errorMessages: errorDetails
      });
    }
  }

  throw new AiError(
    "AI generated output failed schema requirements after bounded retries",
    "AI_INVALID_OUTPUT",
    { error: lastError }
  );
}

export default {
  generateStructured
};
