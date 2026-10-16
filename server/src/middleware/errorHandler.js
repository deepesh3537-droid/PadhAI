import { AppError } from "../utils/errors.js";

/**
 * Global error handling middleware returning standardized, safe JSON responses.
 */
export function errorHandler(err, req, res, next) {
  // Log full error details on the server
  if (process.env.NODE_ENV !== "test") {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  // Handle unexpected errors safely without leaking internal stack traces
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later."
    }
  });
}
