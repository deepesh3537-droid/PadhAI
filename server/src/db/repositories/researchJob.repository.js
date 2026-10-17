import { getSupabaseClient, supabaseServer } from "../supabaseAdmin.js";
import { validateStatusTransition } from "../../research/stateMachine.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";

/**
 * Repository for durable research_jobs persistence, state transitions, and recovery.
 *
 * Implements:
 * - User-scoped RLS queries when token is provided.
 * - Server worker queries when running internal recovery tasks.
 * - Concurrency control: Checks and prevents duplicate active jobs per course.
 */

/**
 * Creates a new research job for a course owned by the user.
 * If an active job already exists, returns the existing active job instead of creating a duplicate.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.courseId
 * @param {string} [params.token] Authenticated user JWT
 * @returns {Promise<{ job: object, isNew: boolean }>}
 */
export async function createOrGetActiveResearchJob({ userId, courseId, token }) {
  const client = token ? getSupabaseClient(token) : supabaseServer;

  // 1. Check for any currently active job for this course
  const { data: activeJob, error: checkError } = await client
    .from("research_jobs")
    .select("*")
    .eq("course_id", courseId)
    .in("status", ["queued", "researching"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeJob) {
    return { job: activeJob, isNew: false };
  }

  // 2. Insert new queued job
  const { data: newJob, error: insertError } = await client
    .from("research_jobs")
    .insert({
      user_id: userId,
      course_id: courseId,
      status: "queued",
      current_step: "queued",
      progress: {
        totalLessons: 0,
        processedLessons: 0,
        discoveredCount: 0,
        verifiedCount: 0
      }
    })
    .select()
    .single();

  if (insertError) {
    // If caught by the unique partial index constraint (concurrent race condition)
    if (insertError.code === "23505") {
      const { data: racedJob } = await client
        .from("research_jobs")
        .select("*")
        .eq("course_id", courseId)
        .in("status", ["queued", "researching"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (racedJob) {
        return { job: racedJob, isNew: false };
      }
    }
    console.error("[ResearchJobRepository] Failed to create research job:", insertError);
    throw insertError;
  }

  return { job: newJob, isNew: true };
}

/**
 * Fetches the latest research job for a course (active or terminal).
 *
 * @param {string} courseId
 * @param {string} userId
 * @param {string} [token]
 * @returns {Promise<object|null>}
 */
export async function findLatestResearchJobByCourse(courseId, userId, token) {
  const client = token ? getSupabaseClient(token) : supabaseServer;

  const { data, error } = await client
    .from("research_jobs")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[ResearchJobRepository] findLatestResearchJobByCourse error:", error.message);
    return null;
  }

  return data;
}

/**
 * Fetches a research job by its primary key ID (owner-only).
 *
 * @param {string} jobId
 * @param {string} userId
 * @param {string} [token]
 * @returns {Promise<object|null>}
 */
export async function findResearchJobById(jobId, userId, token) {
  const client = token ? getSupabaseClient(token) : supabaseServer;

  const { data, error } = await client
    .from("research_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn(`[ResearchJobRepository] findResearchJobById error for ${jobId}:`, error.message);
    return null;
  }

  return data;
}

/**
 * Atomically transitions or updates the status and progress of a research job.
 *
 * @param {string} jobId
 * @param {object} updates
 * @param {string} [updates.status]
 * @param {string} [updates.current_step]
 * @param {object} [updates.progress]
 * @param {string} [updates.safe_error]
 * @param {string} [token]
 * @returns {Promise<object>}
 */
export async function updateResearchJob(jobId, updates, token) {
  const client = token ? getSupabaseClient(token) : supabaseServer;

  // Enforce valid status transition if status is being updated (TEST_PLAN §9)
  if (updates.status) {
    const { data: currentJob } = await client
      .from("research_jobs")
      .select("status")
      .eq("id", jobId)
      .maybeSingle();

    if (currentJob?.status) {
      validateStatusTransition(currentJob.status, updates.status);
    }
  }

  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from("research_jobs")
    .update(payload)
    .eq("id", jobId)
    .select()
    .single();

  if (error) {
    console.error(`[ResearchJobRepository] Failed to update job ${jobId}:`, error);
    throw error;
  }

  return data;
}

/**
 * Reclaims orphaned or abandoned jobs upon server startup.
 * Marks jobs that were stuck in 'researching' as 'failed' with a recoverable safe error,
 * so the learner can retry them cleanly without deadlock.
 *
 * @returns {Promise<number>} Count of reclaimed jobs
 */
export async function reclaimAbandonedResearchJobs() {
  try {
    const { data, error } = await supabaseServer
      .from("research_jobs")
      .update({
        status: "failed",
        current_step: "interrupted",
        safe_error: "Research was interrupted due to server restart. Please click 'Retry Research' to resume.",
        updated_at: new Date().toISOString()
      })
      .eq("status", "researching")
      .select("id");

    if (error) {
      console.warn("[ResearchJobRepository] Could not reclaim abandoned jobs (table may not exist yet):", error.message);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      console.log(`[ResearchJobRepository] Reclaimed ${count} abandoned research job(s).`);
    }
    return count;
  } catch (err) {
    console.warn("[ResearchJobRepository] Reclaim check skipped:", err.message);
    return 0;
  }
}

/**
 * Retries a failed research job by transitioning its status back to 'queued'.
 * Validates that current status is 'failed' (enforcing valid transition failed -> queued).
 * Bounded retries: enforces maxRetries (default 3) stored in progress.retryCount.
 *
 * @param {string} jobId
 * @param {string} userId
 * @param {string} [token]
 * @returns {Promise<object>}
 */
export async function retryResearchJob(jobId, userId, token) {
  const client = token ? getSupabaseClient(token) : supabaseServer;

  const { data: job, error: fetchError } = await client
    .from("research_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !job) {
    throw new NotFoundError(`Research job ${jobId} not found`);
  }

  // Validate state machine transition (failed -> queued)
  validateStatusTransition(job.status, "queued");

  const currentRetries = job.progress?.retryCount || 0;
  const maxRetries = 3;
  if (currentRetries >= maxRetries) {
    throw new ValidationError(`Job has reached the maximum retry limit of ${maxRetries}.`);
  }

  const updatedProgress = {
    ...(job.progress || {}),
    retryCount: currentRetries + 1
  };

  const { data: updatedJob, error: updateError } = await client
    .from("research_jobs")
    .update({
      status: "queued",
      current_step: "queued",
      safe_error: null,
      progress: updatedProgress,
      updated_at: new Date().toISOString()
    })
    .eq("id", jobId)
    .select()
    .single();

  if (updateError) {
    console.error(`[ResearchJobRepository] Failed to retry job ${jobId}:`, updateError);
    throw updateError;
  }

  return updatedJob;
}

export default {
  createOrGetActiveResearchJob,
  findLatestResearchJobByCourse,
  findResearchJobById,
  updateResearchJob,
  retryResearchJob,
  reclaimAbandonedResearchJobs
};
