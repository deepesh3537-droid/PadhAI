import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../../src/app.js";

test("GET /api/health returns 200 with status ok", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.status, "ok");
    assert.ok(data.timestamp);
    assert.equal(typeof data.uptimeSeconds, "number");
  } finally {
    server.close();
  }
});

test("GET /api/unknown returns 404 with safe error response", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/nonexistent`);
    assert.equal(res.status, 404);

    const data = await res.json();
    assert.equal(data.error.code, "NOT_FOUND");
    assert.ok(data.error.message);
  } finally {
    server.close();
  }
});
