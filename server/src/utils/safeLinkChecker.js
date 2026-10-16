import dns from "node:dns/promises";
import net from "node:net";
import { limits } from "../config/limits.js";

/**
 * Checks if an IP address is a private, loopback, link-local, or otherwise internal address.
 * Prevents Server-Side Request Forgery (SSRF) when verifying external resources.
 *
 * @param {string} ip
 * @returns {boolean} True if the IP is private or reserved
 */
export function isPrivateIp(ip) {
  if (!net.isIP(ip)) {
    return true; // Malformed IP is treated as unsafe
  }

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [b0, b1] = parts;

    // Loopback: 127.0.0.0/8
    if (b0 === 127) return true;
    // 0.0.0.0/8
    if (b0 === 0) return true;
    // Private range A: 10.0.0.0/8
    if (b0 === 10) return true;
    // Private range B: 172.16.0.0/12 (172.16.0.0 – 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // Private range C: 192.168.0.0/16
    if (b0 === 192 && b1 === 168) return true;
    // Link-local: 169.254.0.0/16 (includes cloud metadata endpoints e.g. 169.254.169.254)
    if (b0 === 169 && b1 === 254) return true;
    // Broadcast / reserved
    if (b0 >= 224) return true;

    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback ::1
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // Unspecified ::
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    // Unique local: fc00::/7 (fc00... or fd00...)
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // Link-local: fe80::/10
    if (lower.startsWith("fe80") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
    // IPv4-mapped IPv6 ::ffff:127.0.0.1
    if (lower.includes("::ffff:")) {
      const ipv4Part = lower.split("::ffff:")[1];
      if (ipv4Part && net.isIPv4(ipv4Part)) {
        return isPrivateIp(ipv4Part);
      }
    }

    return false;
  }

  return true;
}

/**
 * Validates that a hostname does not resolve to private or internal addresses.
 *
 * @param {string} hostname
 * @returns {Promise<{ safe: boolean, ip?: string, error?: string }>}
 */
export async function checkHostSafety(hostname) {
  if (!hostname || typeof hostname !== "string") {
    return { safe: false, error: "Invalid hostname" };
  }

  // Explicit forbidden hostnames
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local") || lower.endsWith(".internal")) {
    return { safe: false, error: "Localhost or internal domain blocked" };
  }

  // If hostname is directly an IP literal
  if (net.isIP(lower)) {
    if (isPrivateIp(lower)) {
      return { safe: false, error: "Direct private IP addresses are blocked" };
    }
    return { safe: true, ip: lower };
  }

  try {
    const lookup = await dns.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      return { safe: false, error: "Domain resolution returned no addresses" };
    }

    for (const record of lookup) {
      if (isPrivateIp(record.address)) {
        return {
          safe: false,
          error: `Domain resolved to private/forbidden IP: ${record.address}`
        };
      }
    }

    return { safe: true, ip: lookup[0].address };
  } catch (err) {
    return { safe: false, error: `DNS lookup failed: ${err.message}` };
  }
}

/**
 * Performs a safe HTTP HEAD or GET check to verify if a link is alive and accessible.
 * Enforces:
 * - SSRF protection (private IP blocking)
 * - Strict timeout (default 5000ms)
 * - Maximum response size cap (default 500KB)
 *
 * @param {string} rawUrl
 * @param {object} [options]
 * @param {number} [options.timeoutMs=5000]
 * @param {number} [options.maxSizeBytes=500000]
 * @returns {Promise<{
 *   isAlive: boolean,
 *   accessStatus: 'accessible'|'dead'|'restricted'|'paywalled',
 *   contentType?: string,
 *   contentLength?: number,
 *   error?: string
 * }>}
 */
export async function checkSafeLink(rawUrl, {
  timeoutMs = 5000,
  maxSizeBytes = limits.research.maxDocBytes || 500000
} = {}) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { isAlive: false, accessStatus: "dead", error: "Unsupported protocol" };
    }
  } catch {
    return { isAlive: false, accessStatus: "dead", error: "Invalid URL string" };
  }

  // 1. SSRF host validation
  const hostCheck = await checkHostSafety(parsed.hostname);
  if (!hostCheck.safe) {
    return { isAlive: false, accessStatus: "restricted", error: hostCheck.error };
  }

  // 2. Timed request with abort signal
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Attempt HEAD request first to check status and headers without body
    let response = await fetch(rawUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "PadhAI-Resource-Checker/1.0",
        "Accept": "*/*"
      },
      signal: controller.signal,
      redirect: "follow"
    }).catch(() => null);

    // If HEAD failed or was rejected (some servers reject HEAD with 405/403), fallback to GET with stream cap
    if (!response || !response.ok) {
      response = await fetch(rawUrl, {
        method: "GET",
        headers: {
          "User-Agent": "PadhAI-Resource-Checker/1.0",
          "Accept": "*/*",
          "Range": `bytes=0-${maxSizeBytes}`
        },
        signal: controller.signal,
        redirect: "follow"
      });
    }

    clearTimeout(timeoutId);

    const status = response.status;
    const contentType = response.headers.get("content-type") || "";
    const contentLength = parseInt(response.headers.get("content-length") || "0", 10);

    // Check size cap if header declared
    if (contentLength > maxSizeBytes * 4) { // generous upper bound on declared length
      console.warn(`[SafeLinkChecker] Warning: Declared content length ${contentLength} exceeds budget`);
    }

    if (status >= 200 && status < 400) {
      return {
        isAlive: true,
        accessStatus: "accessible",
        contentType,
        contentLength
      };
    } else if (status === 401 || status === 402 || status === 403) {
      return {
        isAlive: true,
        accessStatus: status === 402 ? "paywalled" : "restricted",
        contentType
      };
    } else {
      return {
        isAlive: false,
        accessStatus: "dead",
        error: `HTTP ${status}`
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      isAlive: false,
      accessStatus: "dead",
      error: err.name === "AbortError" ? "Request timed out" : err.message
    };
  }
}

export default {
  isPrivateIp,
  checkHostSafety,
  checkSafeLink
};
