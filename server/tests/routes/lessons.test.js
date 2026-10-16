import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../../src/app.js";

test("POST /api/lessons/:id/complete without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/lessons/fake-lesson-id/complete`, {
      method: "POST"
    });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
    assert.match(data.error.message, /Missing or malformed Authorization header/);
  } finally {
    server.close();
  }
});

test("GET /api/courses/:id/progress without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/courses/fake-course-id/progress`);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
    assert.match(data.error.message, /Missing or malformed Authorization header/);
  } finally {
    server.close();
  }
});

test("POST /api/lessons/:id/complete with invalid Bearer token returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/lessons/fake-lesson-id/complete`, {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid.token.value"
      }
    });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
  } finally {
    server.close();
  }
});
