import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../../src/app.js";

test("GET /api/me without Authorization header returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/me`);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
    assert.match(data.error.message, /Missing or malformed Authorization header/);
  } finally {
    server.close();
  }
});

test("GET /api/me with invalid Bearer token returns 401 UNAUTHORIZED", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/me`, {
      headers: {
        Authorization: "Bearer invalid.jwt.token"
      }
    });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.error.code, "UNAUTHORIZED");
  } finally {
    server.close();
  }
});
