import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { findResearchJobById } from "../db/repositories/researchJob.repository.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

export const jobsRouter = Router();

const jobIdParamSchema = z.string().uuid("Invalid job UUID");

/**
 * GET /api/jobs/:id
 * Retrieve research job status and progress by ID (owner-only).
 * (TASK-068, PRD §6 F2, TEST_PLAN §9).
 */
jobsRouter.get("/jobs/:id", requireAuth, async (req, res, next) => {
  try {
    const parseResult = jobIdParamSchema.safeParse(req.params.id);
    if (!parseResult.success) {
      throw new ValidationError("Invalid job UUID format");
    }

    const job = await findResearchJobById(req.params.id, req.user.id, req.token);
    if (!job) {
      throw new NotFoundError(`Research job ${req.params.id} not found`);
    }

    res.json({ job });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/jobs/:id/retry
 * Retries a failed research job (owner-only, bounded retries).
 * (TASK-068, TASK-072, PRD §6 F2, TEST_PLAN §9).
 */
jobsRouter.post("/jobs/:id/retry", requireAuth, async (req, res, next) => {
  try {
    const parseResult = jobIdParamSchema.safeParse(req.params.id);
    if (!parseResult.success) {
      throw new ValidationError("Invalid job UUID format");
    }

    const { retryResearchJob } = await import("../db/repositories/researchJob.repository.js");
    const { processResearchJob } = await import("../research/worker.js");

    const retriedJob = await retryResearchJob(req.params.id, req.user.id, req.token);

    // Fire worker asynchronously
    processResearchJob({
      jobId: retriedJob.id,
      courseId: retriedJob.course_id,
      userId: req.user.id,
      token: req.token
    }).catch((err) => console.warn(`[JobsRoutes] Background retry failed for ${retriedJob.id}:`, err.message));

    res.json({
      job: retriedJob,
      message: "Research retry started"
    });
  } catch (err) {
    next(err);
  }
});

export default jobsRouter;
