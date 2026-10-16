import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { markLessonCompleted } from "../services/progress.service.js";
import { getLessonResources } from "../research/pipeline.js";

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

/**
 * GET /api/lessons/:id/resources
 * Retrieve verified resources linked to a specific lesson.
 */
lessonsRouter.get("/lessons/:id/resources", requireAuth, async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const resources = await getLessonResources(lessonId, req.token);
    res.json({ resources });
  } catch (err) {
    next(err);
  }
});

export default lessonsRouter;

