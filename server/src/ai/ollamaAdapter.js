import { env } from "../config/env.js";
import { limits } from "../config/limits.js";
import { AiError } from "../utils/errors.js";

/**
 * Ollama HTTP Adapter for local inference.
 */
export async function ollamaGenerate({
  prompt,
  model = env.OLLAMA_MODEL,
  format = "json",
  options = {},
  baseUrl = env.OLLAMA_BASE_URL
}) {
  const url = `${baseUrl}/api/generate`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), limits.ai.requestTimeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        format,
        stream: false,
        options: {
          temperature: limits.ai.defaultTemperature,
          ...options
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new AiError(`Ollama service error: HTTP ${res.status} - ${errText}`, "AI_SERVICE_UNAVAILABLE");
    }

    const data = await res.json();
    return data.response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new AiError("AI inference request timed out", "AI_TIMEOUT");
    }
    if (err instanceof AiError) throw err;
    throw new AiError(`Failed to connect to local Ollama runtime: ${err.message}`, "AI_UNREACHABLE");
  }
}

export default {
  generate: ollamaGenerate
};
