import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { aiRateLimiter } from "../middleware/rateLimit.js";
import {
  generateAndSaveCourse,
  getUserCourses,
  getCourseDetails
} from "../services/course.service.js";
import { getCourseProgress } from "../services/progress.service.js";

export const coursesRouter = Router();

const createCourseSchema = z.object({
  topic: z.string().min(2, "Topic must be at least 2 characters").max(200, "Topic too long"),
  goal: z.string().min(5, "Goal must be at least 5 characters").max(500, "Goal too long"),
  depth: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Depth must be 'beginner', 'intermediate', or 'advanced'" })
  })
});

/**
 * POST /api/courses
 * Generate structured outline via Ollama and save atomically to PostgreSQL.
 */
coursesRouter.post(
  "/courses",
  requireAuth,
  aiRateLimiter,
  validateBody(createCourseSchema),
  async (req, res, next) => {
    try {
      const { topic, goal, depth } = req.body;
      const course = await generateAndSaveCourse({
        userId: req.user.id,
        topic,
        goal,
        depth,
        token: req.token
      });
      res.status(201).json({ course });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/courses
 * List all courses owned by the authenticated user.
 */
coursesRouter.get("/courses", requireAuth, async (req, res, next) => {
  try {
    const courses = await getUserCourses(req.user.id, req.token);
    res.json({ courses });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/courses/:id
 * Retrieve course details with nested modules and lessons (owner-only).
 */
coursesRouter.get("/courses/:id", requireAuth, async (req, res, next) => {
  try {
    const course = await getCourseDetails(req.params.id, req.user.id, req.token);
    res.json({ course });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/courses/:id/progress
 * Retrieve completion percentage and list of completed lessons (owner-only).
 */
coursesRouter.get("/courses/:id/progress", requireAuth, async (req, res, next) => {
  try {
    const course = await getCourseDetails(req.params.id, req.user.id, req.token);
    const progress = await getCourseProgress({ userId: req.user.id, course, token: req.token });
    res.json({ progress });
  } catch (err) {
    next(err);
  }
});

export default coursesRouter;
