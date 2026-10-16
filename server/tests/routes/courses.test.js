import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../../src/app.js";

test("GET /api/courses without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/courses`);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
    assert.match(data.error.message, /Missing or malformed Authorization header/);
  } finally {
    server.close();
  }
});

test("POST /api/courses without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "Calculus",
        goal: "Master limits and derivatives",
        depth: "beginner"
      })
    });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
  } finally {
    server.close();
  }
});

test("GET /api/courses/:id without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/courses/some-fake-id`);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
  } finally {
    server.close();
  }
});

test("POST /api/courses with invalid Bearer token returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/courses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid.fake.token"
      },
      body: JSON.stringify({
        topic: "Calculus",
        goal: "Master limits",
        depth: "beginner"
      })
    });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
  } finally {
    server.close();
  }
});
