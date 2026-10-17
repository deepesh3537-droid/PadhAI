import { env } from "./env.js";

/**
 * Centralized operational budgets and system limits.
 * All timeouts, token budgets, and retry counters are defined here.
 */
export const limits = {
  ai: {
    maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS || 1500,
    requestTimeoutMs: env.AI_REQUEST_TIMEOUT_MS || 120000,
    maxRetries: env.AI_MAX_RETRIES || 2,
    defaultTemperature: 0.6
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS || 60000,
    maxStandardRequests: env.RATE_LIMIT_MAX_REQUESTS || 60,
    maxAiRequests: env.RATE_LIMIT_AI_MAX_REQUESTS || 5
  },
  course: {
    maxTopicLength: 200,
    maxGoalLength: 500,
    allowedDepths: ["beginner", "intermediate", "advanced"]
  },
  research: {
    maxSearchRounds: 2,
    maxResultsPerTopic: 5,
    maxPages: 20,
    maxDocBytes: 500000,
    jobTimeoutMs: 600000
  },
  syllabus: {
    maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB (ADR-020)
    allowedExtensions: [".pdf", ".txt", ".md"],
    allowedMimeTypes: ["application/pdf", "text/plain", "text/markdown"],
    maxExtractedChars: 50000,
    minExtractedChars: 50
  }
};

export default limits;
