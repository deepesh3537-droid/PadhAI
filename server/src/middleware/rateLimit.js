import rateLimit from "express-rate-limit";
import { limits } from "../config/limits.js";

/**
 * Standard API rate limiter.
 */
export const standardRateLimiter = rateLimit({
  windowMs: limits.rateLimit.windowMs,
  max: limits.rateLimit.maxStandardRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again in a few moments."
    }
  }
});

/**
 * Stricter rate limiter for resource-intensive AI generation endpoints.
 */
export const aiRateLimiter = rateLimit({
  windowMs: limits.rateLimit.windowMs,
  max: limits.rateLimit.maxAiRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "AI_RATE_LIMIT_EXCEEDED",
      message: "AI usage limit reached for now. Please wait before generating another course."
    }
  }
});

/**
 * Rate limiter for interactive AI tutor questions (TEST_PLAN §8).
 */
export const tutorRateLimiter = rateLimit({
  windowMs: limits.rateLimit.windowMs,
  max: limits.rateLimit.maxAiRequests,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: {
      code: "AI_RATE_LIMIT_EXCEEDED",
      message: "AI tutor question limit reached for now. Please wait a moment before sending another question."
    }
  }
});

/**
 * Rate limiter for syllabus upload and extraction endpoints (TEST_PLAN §11).
 */
export const syllabusRateLimiter = rateLimit({
  windowMs: limits.rateLimit.windowMs,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Syllabus upload limit reached. Please wait a moment before uploading another document."
    }
  }
});

export default {
  standardRateLimiter,
  aiRateLimiter,
  tutorRateLimiter,
  syllabusRateLimiter
};
