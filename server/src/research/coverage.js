import { extractKeywords, evaluateRelevance } from "./relevanceFilter.js";
import { searchSearXNG } from "./providers/searxng.js";
import { limits } from "../config/limits.js";

/**
 * Evaluates whether a specific learning objective is addressed by candidate resources.
 *
 * @param {string} objective
 * @param {Array<object>} resources
 * @returns {object|null} Matching resource if covered, null otherwise
 */
export function findCoveringResource(objective, resources = []) {
  if (!objective || !Array.isArray(resources) || resources.length === 0) {
    return null;
  }

  const objKeywords = extractKeywords(objective);
  if (objKeywords.size === 0) return null;

  for (const res of resources) {
    const rel = evaluateRelevance(
      {
        title: res.title || "",
        snippet: res.summary || res.snippet || "",
        url: res.url || ""
      },
      objective
    );

    // If relevance score >= 0.20 or matched multiple objective keywords
    if (rel.score >= 0.2 || rel.matchedKeywords.length >= 2) {
      return { resource: res, score: rel.score, matchedKeywords: rel.matchedKeywords };
    }
  }

  return null;
}

/**
 * Evaluates total curriculum coverage for a lesson's learning objectives,
 * executes at most ONE bounded follow-up search for uncovered objectives,
 * and honestly documents any remaining coverage gaps.
 * (PRD §6 F2, TASK-071, TEST_PLAN §9).
 *
 * @param {object} params
 * @param {string} params.lessonTitle
 * @param {Array<string>} params.objectives
 * @param {Array<object>} params.existingResources
 * @param {string} [params.courseTopic]
 * @param {Function} [params.searchFn] Injectable search provider for testing/mocking
 * @returns {Promise<object>} Coverage analysis with explicit gaps
 */
export async function evaluateLessonCoverage({
  lessonTitle,
  objectives = [],
  existingResources = [],
  courseTopic = "",
  searchFn = searchSearXNG
}) {
  const normalizedObjectives = Array.isArray(objectives) ? objectives : [];
  if (normalizedObjectives.length === 0) {
    return {
      totalObjectives: 0,
      coveredCount: 0,
      coveragePercentage: 100,
      coveredObjectives: [],
      gaps: [],
      isFullyCovered: true,
      followUpSearches: 0
    };
  }

  const covered = [];
  const uncovered = [];

  // 1. Initial coverage check against currently discovered resources
  for (const obj of normalizedObjectives) {
    const match = findCoveringResource(obj, existingResources);
    if (match) {
      covered.push({ objective: obj, matchedResourceTitle: match.resource.title });
    } else {
      uncovered.push(obj);
    }
  }

  let followUpSearches = 0;
  const newDiscoveredResources = [];

  // 2. Bounded follow-up search: at most 1 round per lesson (TASK-071, limits.research.maxSearchRounds)
  if (uncovered.length > 0 && limits.research.maxSearchRounds > 1) {
    followUpSearches++;
    const targetObj = uncovered[0];
    const query = courseTopic
      ? `${courseTopic} ${targetObj} tutorial guide`
      : `${lessonTitle} ${targetObj} tutorial guide`;

    try {
      const followUpResults = await searchFn(query, { maxResults: 3 });
      for (const item of followUpResults || []) {
        const rel = evaluateRelevance(item, targetObj);
        if (rel.isRelevant) {
          newDiscoveredResources.push({
            url: item.url,
            title: item.title,
            summary: item.snippet,
            type: "article",
            relevanceScore: rel.score
          });
        }
      }
    } catch (err) {
      console.warn(`[Coverage] Follow-up search skipped for "${targetObj}":`, err.message);
    }

    // Re-check coverage with new resources
    if (newDiscoveredResources.length > 0) {
      const stillUncovered = [];
      for (const obj of uncovered) {
        const match = findCoveringResource(obj, newDiscoveredResources);
        if (match) {
          covered.push({ objective: obj, matchedResourceTitle: match.resource.title });
        } else {
          stillUncovered.push(obj);
        }
      }
      uncovered.length = 0;
      uncovered.push(...stillUncovered);
    }
  }

  // 3. Mark remaining gaps HONESTLY (Never claim full coverage when gaps exist)
  const gaps = uncovered.map((obj) => ({
    objective: obj,
    covered: false,
    reason: "No freely accessible tutorial or documentation found for this specific objective"
  }));

  const total = normalizedObjectives.length;
  const coveragePercentage = total > 0 ? Math.round((covered.length / total) * 100) : 100;

  return {
    totalObjectives: total,
    coveredCount: covered.length,
    coveragePercentage,
    coveredObjectives: covered,
    gaps,
    isFullyCovered: gaps.length === 0,
    followUpSearches,
    newDiscoveredResources
  };
}

export default {
  findCoveringResource,
  evaluateLessonCoverage
};
