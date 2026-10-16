/**
 * URL Normalization and Deduplication Utilities
 * Aligned with TASK-042 and TEST_PLAN §5:
 * - "Duplicate URLs (including trivial variants) are deduplicated"
 */

// Tracking parameters commonly appended by search engines, social media, and analytics
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ref",
  "source",
  "spm",
  "_ga",
  "mc_cid",
  "mc_eid"
]);

/**
 * Normalizes a URL string:
 * 1. Validates standard HTTP/HTTPS schemes.
 * 2. Lowercases scheme and hostname.
 * 3. Strips default ports (:80, :443).
 * 4. Removes URL hashes (#fragments).
 * 5. Strips marketing/tracking query parameters (utm_*, gclid, etc.).
 * 6. Sorts remaining query parameters deterministically.
 * 7. Removes trailing slashes (except root '/').
 *
 * @param {string} rawUrl
 * @returns {string|null} Normalized URL or null if invalid
 */
export function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  try {
    const parsed = new URL(rawUrl.trim());

    // Only allow http: and https: protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove default ports
    if ((parsed.protocol === "http:" && parsed.port === "80") ||
        (parsed.protocol === "https:" && parsed.port === "443")) {
      parsed.port = "";
    }

    // Strip URL fragment
    parsed.hash = "";

    // Clean query parameters
    const cleanedParams = new URLSearchParams();
    const sortedKeys = Array.from(parsed.searchParams.keys()).sort();

    for (const key of sortedKeys) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        for (const val of parsed.searchParams.getAll(key)) {
          cleanedParams.append(key, val);
        }
      }
    }

    // Assign sorted, cleaned params
    parsed.search = cleanedParams.toString();

    // Normalize pathname: strip trailing slash if pathname is longer than 1
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Deduplicates an array of resources or URLs based on their normalized URL.
 *
 * @template T
 * @param {T[]} items List of items (either URL strings or objects with a `url` property)
 * @returns {T[]} Deduplicated array preserving first occurrence
 */
export function deduplicateResources(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const seen = new Set();
  const unique = [];

  for (const item of items) {
    const rawUrl = typeof item === "string" ? item : item?.url;
    const normalized = normalizeUrl(rawUrl);

    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      if (typeof item === "string") {
        unique.push(normalized);
      } else {
        unique.push({
          ...item,
          url: normalized
        });
      }
    }
  }

  return unique;
}

export default {
  normalizeUrl,
  deduplicateResources
};
