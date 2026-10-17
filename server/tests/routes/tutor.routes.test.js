import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { app } from "../../src/app.js";
import { tutorRateLimiter } from "../../src/middleware/rateLimit.js";

test("POST /api/tutor/messages without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/tutor/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: "00000000-0000-0000-0000-000000000000", message: "Help me!" })
    });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
    assert.match(data.error.message, /Missing or malformed Authorization header/);
  } finally {
    server.close();
  }
});

test("GET /api/lessons/:id/tutor without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/lessons/00000000-0000-0000-0000-000000000000/tutor`);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
  } finally {
    server.close();
  }
});

test("TEST_PLAN §8: Tutor request over rate limit returns 429 with friendly message", async () => {
  // Test rate limiter middleware specifically
  const testApp = express();
  testApp.use(tutorRateLimiter);
  testApp.post("/test-tutor-limit", (req, res) => res.json({ ok: true }));

  const server = http.createServer(testApp);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // Send 5 permitted requests
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`http://127.0.0.1:${port}/test-tutor-limit`, { method: "POST" });
      assert.ok(res.status === 200 || res.status === 429);
    }

    // 6th request must trigger rate limit
    const limitedRes = await fetch(`http://127.0.0.1:${port}/test-tutor-limit`, { method: "POST" });
    assert.equal(limitedRes.status, 429);

    const data = await limitedRes.json();
    assert.equal(data.error.code, "AI_RATE_LIMIT_EXCEEDED");
    assert.match(data.error.message, /limit reached/i);
    assert.match(data.error.message, /wait a moment/i);
  } finally {
    server.close();
  }
});
