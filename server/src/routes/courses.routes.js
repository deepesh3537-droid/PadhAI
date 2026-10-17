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
 * POST /api/courses/:id/research
 * Manually trigger or retry educational resource research for a course (owner-only).
 * Prevents concurrent duplicate runs and safely recovers failed jobs.
 */
coursesRouter.post("/courses/:id/research", requireAuth, async (req, res, next) => {
  try {
    const courseId = req.params.id;
    // 1. Verify course ownership
    const course = await getCourseDetails(courseId, req.user.id, req.token);

    const { createOrGetActiveResearchJob } = await import("../db/repositories/researchJob.repository.js");
    const { processResearchJob } = await import("../research/worker.js");

    const { job, isNew } = await createOrGetActiveResearchJob({
      userId: req.user.id,
      courseId: course.id,
      token: req.token
    });

    if (isNew || job.status === "queued") {
      // Fire worker asynchronously
      processResearchJob({
        jobId: job.id,
        courseId: course.id,
        userId: req.user.id,
        token: req.token
      }).catch((err) => console.warn(`[CoursesRoutes] Background retry failed for ${course.id}:`, err.message));
    }

    res.json({
      jobId: job.id,
      status: job.status,
      message: isNew ? "Research started" : "Research already in progress"
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/courses/:id/research/status
 * Check current research job status and progress for a course (owner-only).
 */
coursesRouter.get("/courses/:id/research/status", requireAuth, async (req, res, next) => {
  try {
    const courseId = req.params.id;
    // 1. Verify course ownership
    await getCourseDetails(courseId, req.user.id, req.token);

    const { findLatestResearchJobByCourse } = await import("../db/repositories/researchJob.repository.js");
    const job = await findLatestResearchJobByCourse(courseId, req.user.id, req.token);

    res.json({
      job: job || {
        status: "idle",
        current_step: "none",
        progress: { totalLessons: 0, processedLessons: 0, discoveredCount: 0, verifiedCount: 0 }
      }
    });
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
    const { getCourseProgress } = await import("../services/progress.service.js");
    const progress = await getCourseProgress({ userId: req.user.id, course, token: req.token });
    res.json({ progress });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/courses/:id/mastery
 * Retrieve topic mastery breakdown with evidence counts and uncertainty wording (owner-only).
 * (PRD §6 F6, TASK-061).
 */
coursesRouter.get("/courses/:id/mastery", requireAuth, async (req, res, next) => {
  try {
    // 1. Verify course ownership
    await getCourseDetails(req.params.id, req.user.id, req.token);

    const { getCourseMasteryBreakdown } = await import("../services/mastery.service.js");
    const mastery = await getCourseMasteryBreakdown(req.user.id, req.params.id, req.token);
    res.json({ mastery });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/courses/:id/revisions
 * Retrieve explainable revision recommendations for topics needing practice or spaced refresh (owner-only).
 * (PRD §6 F7, TASK-062).
 */
coursesRouter.get("/courses/:id/revisions", requireAuth, async (req, res, next) => {
  try {
    // 1. Verify course ownership
    await getCourseDetails(req.params.id, req.user.id, req.token);

    const { getRevisionRecommendations } = await import("../services/mastery.service.js");
    const recommendations = await getRevisionRecommendations(req.user.id, req.params.id, req.token);
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

export default coursesRouter;



