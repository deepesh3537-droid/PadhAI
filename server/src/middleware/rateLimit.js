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

export default {
  standardRateLimiter,
  aiRateLimiter
};
