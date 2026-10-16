import { discoverResourcesForLesson } from "./pipeline.js";
import { updateResearchJob } from "../db/repositories/researchJob.repository.js";
import { findCourseByIdAndUser } from "../db/repositories/course.repository.js";
import { limits } from "../config/limits.js";

/**
 * Bounded-Concurrency Background Research Worker
 *
 * Operational Strategy & Limitations:
 * - Single-Process Worker: Executes within the Express Node.js process runtime.
 * - Concurrency Cap: Max 2 concurrent lesson research batches per job to protect network and memory.
 * - Timeout Budget: Enforces limits.research.jobTimeoutMs (default 10 minutes) per job.
 * - Idempotency: Duplicate runs preserve existing resources and links (ON CONFLICT DO NOTHING / UPDATE).
 * - Security: Never persists user tokens in DB; runs tasks using provided short-lived context.
 *
 * Limitations of Single-Process Architecture:
 * - If the server process dies or restarts mid-flight, active jobs are reclaimed as 'failed' upon next boot.
 * - In multi-server / horizontal production environments, a Redis / BullMQ or pg-boss queue would be needed.
 */

const activeJobSet = new Set();

/**
 * Processes a research job sequentially or with bounded concurrency across all lessons of a course.
 *
 * @param {object} params
 * @param {string} params.jobId
 * @param {string} params.courseId
 * @param {string} params.userId
 * @param {string} [params.token]
 * @returns {Promise<object>}
 */
export async function processResearchJob({ jobId, courseId, userId, token }) {
  if (activeJobSet.has(jobId)) {
    console.log(`[ResearchWorker] Job ${jobId} is already actively processing.`);
    return;
  }

  activeJobSet.add(jobId);

  const jobTimeout = limits.research.jobTimeoutMs || 600000;
  let timerId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error("RESEARCH_JOB_TIMEOUT")), jobTimeout);
    if (timerId?.unref) timerId.unref();
  });

  try {
    // 1. Mark job as researching
    await updateResearchJob(jobId, {
      status: "researching",
      current_step: "fetching_course_curriculum",
      safe_error: null
    }, token);

    // 2. Fetch course structure and lessons
    const course = await findCourseByIdAndUser(courseId, userId, token);
    if (!course || !course.modules) {
      throw new Error("Course not found or has no curriculum");
    }

    const allLessons = [];
    course.modules.forEach((mod) => {
      if (mod.lessons) {
        mod.lessons.forEach((les) => {
          allLessons.push({
            id: les.id,
            title: les.title,
            moduleTitle: mod.title
          });
        });
      }
    });

    const totalLessons = allLessons.length;
    let processedLessons = 0;
    let discoveredCount = 0;
    let verifiedCount = 0;

    await updateResearchJob(jobId, {
      current_step: "discovering_resources",
      progress: {
        totalLessons,
        processedLessons,
        discoveredCount,
        verifiedCount
      }
    }, token);

    // 3. Process lessons with bounded concurrency
    // Process in batches of 2 lessons to balance speed and local machine memory/network
    const batchSize = 2;
    for (let i = 0; i < allLessons.length; i += batchSize) {
      const batch = allLessons.slice(i, i + batchSize);

      const batchPromises = batch.map(async (lesson) => {
        try {
          const found = await Promise.race([
            discoverResourcesForLesson({
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              courseTopic: course.title,
              depth: course.target_depth,
              token
            }),
            timeoutPromise
          ]);

          if (Array.isArray(found)) {
            discoveredCount += found.length;
            verifiedCount += found.filter((r) => r.verification_status === "verified").length;
          }
        } catch (err) {
          console.warn(`[ResearchWorker] Lesson ${lesson.id} research skipped/failed:`, err.message);
        } finally {
          processedLessons++;
        }
      });

      await Promise.all(batchPromises);

      // Update progress after each batch
      await updateResearchJob(jobId, {
        current_step: `processed_${processedLessons}_of_${totalLessons}`,
        progress: {
          totalLessons,
          processedLessons,
          discoveredCount,
          verifiedCount
        }
      }, token);
    }

    // 4. Mark completed (even with 0 resources found, it is successfully completed per requirements)
    const finalJob = await updateResearchJob(jobId, {
      status: "completed",
      current_step: "completed",
      progress: {
        totalLessons,
        processedLessons,
        discoveredCount,
        verifiedCount
      },
      safe_error: null
    }, token);

    console.log(`[ResearchWorker] Job ${jobId} completed successfully. Discovered: ${discoveredCount}, Verified: ${verifiedCount}`);
    return finalJob;
  } catch (err) {
    console.error(`[ResearchWorker] Job ${jobId} failed:`, err);
    const safeError = err.message === "RESEARCH_JOB_TIMEOUT"
      ? "Research timed out. You can retry anytime."
      : "Research encountered a problem. Please try again.";

    await updateResearchJob(jobId, {
      status: "failed",
      current_step: "error",
      safe_error: safeError
    }, token).catch(() => null);
  } finally {
    activeJobSet.delete(jobId);
  }
}

export default {
  processResearchJob
};
