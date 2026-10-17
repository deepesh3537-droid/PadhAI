import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../../src/app.js";

test("GET /api/lessons/:id/quiz without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/lessons/fake-lesson-id/quiz`);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
    assert.match(data.error.message, /Missing or malformed Authorization header/);
  } finally {
    server.close();
  }
});

test("POST /api/quizzes/:id/attempts without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/quizzes/fake-quiz-id/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { q1: 0 } })
    });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
    assert.match(data.error.message, /Missing or malformed Authorization header/);
  } finally {
    server.close();
  }
});

test("POST /api/quizzes/:id/attempts with invalid Bearer token returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/quizzes/fake-quiz-id/attempts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid.mock.jwt"
      },
      body: JSON.stringify({ answers: { q1: 0 } })
    });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
  } finally {
    server.close();
  }
});
