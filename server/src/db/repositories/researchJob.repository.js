import { getSupabaseClient, supabaseServer } from "../supabaseAdmin.js";

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

export default {
  createOrGetActiveResearchJob,
  findLatestResearchJobByCourse,
  updateResearchJob,
  reclaimAbandonedResearchJobs
};
