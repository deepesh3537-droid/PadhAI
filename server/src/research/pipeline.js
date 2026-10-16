import { searchSearXNG } from "./providers/searxng.js";
import { normalizeUrl, deduplicateResources } from "../utils/urlUtils.js";
import { checkSafeLink } from "../utils/safeLinkChecker.js";
import { evaluateRelevance, wrapUntrustedText } from "./relevanceFilter.js";
import { upsertResource, linkLessonResource, findResourcesByLessonId } from "../db/repositories/resource.repository.js";
import { limits } from "../config/limits.js";

/**
 * Discovers, filters, safely validates, and attaches educational resources to a lesson.
 * Enforces:
 * - Deduplication and URL normalization (TASK-042)
 * - Safe link checking with SSRF protection, timeouts, and size caps (TASK-043)
 * - Lexical relevance filtering and untrusted wrapper (TASK-044)
 * - Persistent storage with source metadata (TASK-045)
 *
 * @param {object} params
 * @param {string} params.lessonId
 * @param {string} params.lessonTitle
 * @param {string} [params.courseTopic]
 * @param {string} [params.depth]
 * @param {string} params.token Authenticated user JWT
 * @returns {Promise<Array<object>>} List of saved and verified resources
 */
export async function discoverResourcesForLesson({ lessonId, lessonTitle, courseTopic = "", depth = "beginner", token }) {
  if (!lessonId || !lessonTitle) {
    return [];
  }

  // 1. Build targeted educational search queries
  const searchQuery = courseTopic ? `${courseTopic} ${lessonTitle} tutorial guide` : `${lessonTitle} tutorial guide`;

  // 2. Query Search Provider (SearXNG - ADR-018)
  const rawResults = await searchSearXNG({
    query: searchQuery,
    limit: limits.research.maxResultsPerTopic
  });

  if (!rawResults || rawResults.length === 0) {
    return [];
  }

  // 3. Deduplicate and normalize URLs
  const deduplicated = deduplicateResources(rawResults);

  // 4. Relevance filtering & Safe link checking
  const validResources = [];
  let rank = 1;

  for (const item of deduplicated) {
    // Evaluate relevance
    const relevance = evaluateRelevance(item, `${courseTopic} ${lessonTitle}`);
    if (!relevance.isRelevant) {
      continue;
    }

    // SSRF-safe link check
    const linkCheck = await checkSafeLink(item.url);
    if (!linkCheck.isAlive) {
      continue;
    }

    // Determine basic resource type
    let resourceType = "article";
    const lowerUrl = item.url.toLowerCase();
    if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
      resourceType = "video";
    } else if (lowerUrl.endsWith(".pdf") || (linkCheck.contentType && linkCheck.contentType.includes("application/pdf"))) {
      resourceType = "pdf";
    } else if (lowerUrl.includes("docs.") || lowerUrl.includes("/docs") || lowerUrl.includes("developer.mozilla.org")) {
      resourceType = "documentation";
    }

    // Wrap untrusted snippet as clean data
    const wrapped = wrapUntrustedText(item);

    try {
      // 5. Upsert resource into database
      const savedResource = await upsertResource({
        url: item.url,
        title: item.title,
        resource_type: resourceType,
        author: item.engine || null,
        access_status: linkCheck.accessStatus || "accessible",
        relevance_evidence: {
          score: relevance.score,
          matchedKeywords: relevance.matchedKeywords,
          wrappedSummary: wrapped.content
        },
        verification_status: "verified"
      }, token);

      // 6. Link to lesson
      await linkLessonResource({
        lessonId,
        resourceId: savedResource.id,
        rank: rank++,
        note: `Discovered for ${lessonTitle}`
      }, token);

      validResources.push(savedResource);
    } catch (err) {
      console.warn(`[ResourceDiscovery] Failed to persist resource ${item.url}:`, err.message);
    }
  }

  return validResources;
}

/**
 * Retrieves all stored resources for a lesson.
 *
 * @param {string} lessonId
 * @param {string} token
 * @returns {Promise<Array<object>>}
 */
export async function getLessonResources(lessonId, token) {
  return findResourcesByLessonId(lessonId, token);
}

export default {
  discoverResourcesForLesson,
  getLessonResources
};
