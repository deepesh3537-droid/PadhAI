import { getSupabaseClient } from "../supabaseAdmin.js";

/**
 * Educational Resource Repository
 * Handles CRUD and retrieval of resources and lesson_resources mappings.
 */

/**
 * Upserts a resource by unique URL and returns the saved resource.
 *
 * @param {object} resource
 * @param {string} resource.url
 * @param {string} resource.title
 * @param {string} [resource.resource_type='article']
 * @param {string} [resource.author]
 * @param {string} [resource.access_status='accessible']
 * @param {object} [resource.relevance_evidence={}]
 * @param {string} [resource.verification_status='unverified']
 * @param {string} token Authenticated user JWT
 * @returns {Promise<object>}
 */
export async function upsertResource(resource, token) {
  const client = getSupabaseClient(token);

  const payload = {
    url: resource.url,
    title: resource.title,
    resource_type: resource.resource_type || "article",
    author: resource.author || null,
    access_status: resource.access_status || "accessible",
    relevance_evidence: resource.relevance_evidence || {},
    verification_status: resource.verification_status || "unverified"
  };

  const { data, error } = await client
    .from("resources")
    .upsert(payload, { onConflict: "url" })
    .select()
    .single();

  if (error) {
    console.error("[ResourceRepository] upsertResource error:", error);
    throw error;
  }

  return data;
}

/**
 * Associates a resource with a lesson.
 *
 * @param {object} params
 * @param {string} params.lessonId
 * @param {string} params.resourceId
 * @param {number} [params.rank=1]
 * @param {string} [params.note]
 * @param {string} token Authenticated user JWT
 * @returns {Promise<object>}
 */
export async function linkLessonResource({ lessonId, resourceId, rank = 1, note = null }, token) {
  const client = getSupabaseClient(token);

  const { data, error } = await client
    .from("lesson_resources")
    .upsert({
      lesson_id: lessonId,
      resource_id: resourceId,
      rank,
      note
    }, { onConflict: "lesson_id,resource_id" })
    .select()
    .single();

  if (error) {
    console.error("[ResourceRepository] linkLessonResource error:", error);
    throw error;
  }

  return data;
}

/**
 * Fetches all resources linked to a specific lesson, sorted by rank.
 *
 * @param {string} lessonId
 * @param {string} token Authenticated user JWT
 * @returns {Promise<Array<object>>}
 */
export async function findResourcesByLessonId(lessonId, token) {
  const client = getSupabaseClient(token);

  const { data, error } = await client
    .from("lesson_resources")
    .select(`
      rank,
      note,
      resources (
        id,
        url,
        title,
        resource_type,
        author,
        published_at,
        access_status,
        license_notes,
        relevance_evidence,
        verification_status
      )
    `)
    .eq("lesson_id", lessonId)
    .order("rank", { ascending: true });

  if (error) {
    console.error("[ResourceRepository] findResourcesByLessonId error:", error);
    return [];
  }

  if (!data) return [];

  // Flatten the join
  return data
    .filter((lr) => lr.resources)
    .map((lr) => ({
      ...lr.resources,
      rank: lr.rank,
      note: lr.note
    }));
}

export default {
  upsertResource,
  linkLessonResource,
  findResourcesByLessonId
};
