import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { tutorRateLimiter } from "../middleware/rateLimit.js";
import { sendTutorMessage, getLessonTutorHistory } from "../services/tutor.service.js";

export const tutorRouter = Router();

const tutorMessageSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson UUID format"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters")
});

/**
 * POST /api/tutor/messages
 * Submits a question to the course-grounded AI tutor.
 * Returns response with source chips and labeled fallbacks.
 * (PRD §6 F8, ARCHITECTURE §9, TEST_PLAN §8, TASK-064).
 */
tutorRouter.post(
  "/tutor/messages",
  requireAuth,
  tutorRateLimiter,
  validateBody(tutorMessageSchema),
  async (req, res, next) => {
    try {
      const { lessonId, message } = req.body;
      const response = await sendTutorMessage({
        lessonId,
        userId: req.user.id,
        message,
        token: req.token
      });

      res.status(200).json({ message: response });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/lessons/:id/tutor
 * Retrieves persisted conversation history between learner and AI tutor for a lesson.
 * (PRD §6 F8, TEST_PLAN §8).
 */
tutorRouter.get("/lessons/:id/tutor", requireAuth, async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const messages = await getLessonTutorHistory({
      lessonId,
      userId: req.user.id,
      token: req.token
    });

    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
});

export default tutorRouter;
