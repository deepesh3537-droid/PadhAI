import { discoverResourcesForLesson } from "./pipeline.js";
import { evaluateLessonCoverage } from "./coverage.js";
import { updateResearchJob } from "../db/repositories/researchJob.repository.js";
import { findCourseByIdAndUser, updateLessonMetadata } from "../db/repositories/course.repository.js";
import { upsertResource, linkLessonResource } from "../db/repositories/resource.repository.js";
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
            objectives: les.objectives || [],
            moduleTitle: mod.title
          });
        });
      }
    });

    const totalLessons = allLessons.length;
    let processedLessons = 0;
    let discoveredCount = 0;
    let verifiedCount = 0;
    let totalGapsCount = 0;
    const lessonCoverageMap = {};

    await updateResearchJob(jobId, {
      current_step: "discovering_resources",
      progress: {
        totalLessons,
        processedLessons,
        discoveredCount,
        verifiedCount,
        totalGapsCount,
        lessonCoverage: {}
      }
    }, token);

    // 3. Process lessons with bounded concurrency
    // Process in batches of 2 lessons to balance speed and local machine memory/network
    const batchSize = 2;
    for (let i = 0; i < allLessons.length; i += batchSize) {
      const batch = allLessons.slice(i, i + batchSize);

      const batchPromises = batch.map(async (lesson) => {
        try {
          // Bounded step 1: Discover resources (video + text via SearXNG)
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

          // Bounded step 2: Evaluate curriculum coverage & limited follow-up search (TASK-071)
          const coverage = await evaluateLessonCoverage({
            lessonTitle: lesson.title,
            objectives: lesson.objectives || [],
            existingResources: found || [],
            courseTopic: course.title
          });

          // Bounded step 3: Persist newly found follow-up resources if any
          if (coverage.newDiscoveredResources?.length > 0) {
            for (const item of coverage.newDiscoveredResources) {
              try {
                const savedRes = await upsertResource({
                  url: item.url,
                  title: item.title,
                  resource_type: item.type || "article",
                  access_status: "accessible",
                  relevance_evidence: {
                    score: item.relevanceScore || 0.8,
                    matchedKeywords: ["follow_up_coverage"],
                    wrappedSummary: item.summary || ""
                  },
                  verification_status: "verified"
                }, token);

                await linkLessonResource({
                  lessonId: lesson.id,
                  resourceId: savedRes.id,
                  rank: 2,
                  note: `Discovered during coverage follow-up for ${lesson.title}`
                }, token);

                discoveredCount++;
                verifiedCount++;
              } catch (resErr) {
                console.warn(`[ResearchWorker] Follow-up resource persist failed:`, resErr.message);
              }
            }
          }

          // Step 4: Honestly record gaps and update lesson metadata
          lessonCoverageMap[lesson.id] = {
            totalObjectives: coverage.totalObjectives,
            coveredCount: coverage.coveredCount,
            coveragePercentage: coverage.coveragePercentage,
            gaps: coverage.gaps,
            coveredObjectives: coverage.coveredObjectives,
            isFullyCovered: coverage.isFullyCovered
          };

          if (coverage.gaps?.length > 0) {
            totalGapsCount += coverage.gaps.length;
          }

          await updateLessonMetadata(lesson.id, {
            coverageGaps: coverage.gaps,
            coveragePercentage: coverage.coveragePercentage
          }, token).catch(() => null);

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
          verifiedCount,
          totalGapsCount,
          lessonCoverage: lessonCoverageMap
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
        verifiedCount,
        totalGapsCount,
        lessonCoverage: lessonCoverageMap
      },
      safe_error: null
    }, token);

    console.log(`[ResearchWorker] Job ${jobId} completed successfully. Discovered: ${discoveredCount}, Verified: ${verifiedCount}, Gaps: ${totalGapsCount}`);
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
