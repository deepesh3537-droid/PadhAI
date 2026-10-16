import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { markLessonCompleted } from "../services/progress.service.js";

export const lessonsRouter = Router();

/**
 * POST /api/lessons/:id/complete
 * Idempotently mark a lesson as completed by the authenticated user.
 */
lessonsRouter.post("/lessons/:id/complete", requireAuth, async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const progress = await markLessonCompleted({
      userId: req.user.id,
      lessonId,
      token: req.token
    });
    res.json({ success: true, progress });
  } catch (err) {
    next(err);
  }
});

export default lessonsRouter;
