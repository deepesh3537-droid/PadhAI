import https from "node:https";

/**
 * Curated dictionary of top-tier, embeddable educational video tutorials.
 * Used as immediate fallback if dynamic search times out or is unreachable.
 */
const CURATED_TOPIC_VIDEOS = [
  {
    keywords: ["css", "styling", "flexbox", "grid", "selector", "stylesheet"],
    videoId: "AP3_V7KXHs4",
    title: "CSS Tutorial & Walkthrough",
    author: "CodeWithHarry"
  },
  {
    keywords: ["html", "markup", "tags", "dom", "element"],
    videoId: "pQN-pnXPaVg",
    title: "HTML Full Course for Beginners",
    author: "Traversy Media"
  },
  {
    keywords: ["javascript", "js", "ecmascript", "frontend"],
    videoId: "W6NZfCO5SIk",
    title: "JavaScript Tutorial for Beginners",
    author: "Programming with Mosh"
  },
  {
    keywords: ["react", "component", "hooks", "jsx", "state"],
    videoId: "bMknfKXIFA8",
    title: "React Full Course - Beginner to Pro",
    author: "freeCodeCamp"
  },
  {
    keywords: ["python", "django", "flask"],
    videoId: "kqtD5dpn9C8",
    title: "Python for Beginners - Full Course",
    author: "Programming with Mosh"
  },
  {
    keywords: ["kernel", "operating system", "os", "process", "thread", "memory", "deadlock"],
    videoId: "8duV1LLHHJU",
    title: "User Mode and Kernel Mode in Operating Systems",
    author: "Gate Smashers"
  },
  {
    keywords: ["data structure", "dsa", "binary search", "tree", "graph", "algorithm"],
    videoId: "8hly31xKli0",
    title: "Data Structures - Full Course Using C and C++",
    author: "freeCodeCamp"
  },
  {
    keywords: ["git", "github", "version control", "commit", "branch"],
    videoId: "RGOj5yH7evk",
    title: "Git and GitHub for Beginners - Crash Course",
    author: "freeCodeCamp"
  },
  {
    keywords: ["sql", "database", "postgres", "query", "relational"],
    videoId: "HXV3zeRR3h4",
    title: "SQL Tutorial - Full Database Course for Beginners",
    author: "freeCodeCamp"
  }
];

const DEFAULT_FALLBACK_VIDEO = {
  videoId: "26QPDBe-NB8",
  title: "Introductory Educational Lecture",
  author: "CrashCourse"
};

/**
 * Searches YouTube over IPv4 for an active video matching the query.
 *
 * @param {string} query
 * @param {number} [timeoutMs=4000]
 * @returns {Promise<{ videoId: string, title?: string, author?: string }|null>}
 */
export function searchYouTubeVideo(query, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " tutorial")}`;

    const req = https.get(
      searchUrl,
      {
        family: 4, // Force IPv4 to avoid Windows undici/Node connect timeouts
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        }
      },
      (res) => {
        let html = "";
        res.on("data", (chunk) => {
          html += chunk;
          // If we already captured a watch ID, we can end early
          if (html.length > 200000) {
            req.destroy();
          }
        });

        res.on("end", () => {
          const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
          if (match && match[1]) {
            const videoId = match[1];

            // Attempt fast oEmbed title lookup
            fetchOEmbed(videoId)
              .then((meta) => {
                resolve({
                  videoId,
                  title: meta?.title,
                  author: meta?.author_name
                });
              })
              .catch(() => {
                resolve({ videoId });
              });
          } else {
            resolve(null);
          }
        });

        res.on("error", () => resolve(null));
      }
    );

    req.on("error", () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Fetches oEmbed metadata for a specific YouTube video ID.
 */
function fetchOEmbed(videoId, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const req = https.get(oembedUrl, { family: 4 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Invalid JSON"));
        }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

/**
 * Resolves a real, directly playable YouTube video for a lesson.
 * Priority:
 * 1. Live YouTube search via IPv4 (returns top relevant 11-char video ID)
 * 2. Curated topic-mapped video fallback
 * 3. Default educational fallback
 *
 * @param {object} params
 * @param {string} params.lessonTitle
 * @param {string} [params.courseTopic]
 * @returns {Promise<{ videoId: string, url: string, title: string, author: string }>}
 */
export async function resolveVideoForLesson({ lessonTitle, courseTopic = "" }) {
  const fullSearchQuery = `${courseTopic} ${lessonTitle}`.trim();

  // 1. Try dynamic YouTube lookup
  try {
    const found = await searchYouTubeVideo(fullSearchQuery, 3500);
    if (found?.videoId) {
      return {
        videoId: found.videoId,
        url: `https://www.youtube.com/watch?v=${found.videoId}`,
        title: found.title || `${lessonTitle} — Video Tutorial`,
        author: found.author || "YouTube Education"
      };
    }
  } catch {
    // Ignore and proceed to curated fallback
  }

  // 2. Keyword matching on curated educational videos
  const lowerQuery = fullSearchQuery.toLowerCase();
  for (const entry of CURATED_TOPIC_VIDEOS) {
    if (entry.keywords.some((k) => lowerQuery.includes(k))) {
      return {
        videoId: entry.videoId,
        url: `https://www.youtube.com/watch?v=${entry.videoId}`,
        title: `${lessonTitle} — ${entry.title}`,
        author: entry.author
      };
    }
  }

  // 3. Fallback
  return {
    videoId: DEFAULT_FALLBACK_VIDEO.videoId,
    url: `https://www.youtube.com/watch?v=${DEFAULT_FALLBACK_VIDEO.videoId}`,
    title: `${lessonTitle} — ${DEFAULT_FALLBACK_VIDEO.title}`,
    author: DEFAULT_FALLBACK_VIDEO.author
  };
}

export default {
  searchYouTubeVideo,
  resolveVideoForLesson
};
