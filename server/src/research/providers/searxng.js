import { env } from "../../config/env.js";
import { limits } from "../../config/limits.js";

/**
 * SearXNG Provider
 * Interacts with a local or self-hosted SearXNG instance using JSON format.
 * Endpoint: GET /search?q=<query>&format=json&categories=general,science
 */
export async function searchSearXNG({ query, limit = limits.research.maxResultsPerTopic, timeoutMs = env.RESEARCH_SEARCH_TIMEOUT_MS }) {
  if (!query || typeof query !== "string" || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();
  const baseUrl = env.SEARXNG_URL.replace(/\/+$/, "");
  const searchUrl = new URL(`${baseUrl}/search`);
  searchUrl.searchParams.set("q", cleanQuery);
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("categories", "general,science");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(searchUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "PadhAI-Research-Agent/1.0"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[SearXNG Provider] HTTP error ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.results)) {
      return [];
    }

    // Map to normalized provider search result shape
    return data.results.slice(0, limit).map((item) => ({
      title: item.title || "Untitled Resource",
      url: item.url,
      snippet: item.content || "",
      engine: item.engine || "searxng",
      publishedDate: item.publishedDate || null
    }));
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn(`[SearXNG Provider] Request timed out after ${timeoutMs}ms for query: "${cleanQuery}"`);
    } else {
      console.warn(`[SearXNG Provider] Search request failed: ${err.message}`);
    }
    // Graceful degradation per TEST_PLAN §5: Provider failure returns empty list, doesn't crash pipeline
    return [];
  }
}

export default {
  search: searchSearXNG
};
