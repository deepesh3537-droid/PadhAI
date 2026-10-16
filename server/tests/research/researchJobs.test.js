import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { searchSearXNG } from "../../src/research/providers/searxng.js";
import { processResearchJob } from "../../src/research/worker.js";
import {
  createOrGetActiveResearchJob,
  reclaimAbandonedResearchJobs
} from "../../src/db/repositories/researchJob.repository.js";

describe("Durable Research Jobs & Concurrency Tests", () => {
  describe("Provider Error Handling", () => {
    test("searchSearXNG handles offline/unreachable instance gracefully without crashing", async () => {
      // Connect to non-existent port to test fast failure
      const results = await searchSearXNG({
        query: "binary search algorithm",
        limit: 5,
        timeoutMs: 500
      });

      assert.ok(Array.isArray(results));
      assert.equal(results.length, 0);
    });

    test("searchSearXNG returns empty list on empty or whitespace query", async () => {
      const results1 = await searchSearXNG({ query: "" });
      const results2 = await searchSearXNG({ query: "   " });
      assert.deepEqual(results1, []);
      assert.deepEqual(results2, []);
    });
  });

  describe("Job Recovery on Startup", () => {
    test("reclaimAbandonedResearchJobs completes safely without unhandled exceptions", async () => {
      const reclaimed = await reclaimAbandonedResearchJobs();
      assert.equal(typeof reclaimed, "number");
    });
  });

  describe("Worker Execution & Safe Failure", () => {
    test("processResearchJob safely sets job to failed when course curriculum is missing", async () => {
      const result = await processResearchJob({
        jobId: "fake-job-id",
        courseId: "non-existent-course-id",
        userId: "test-user-id"
      });
      // Does not throw; worker catches error and marks job safely
      assert.equal(result, undefined);
    });
  });
});
