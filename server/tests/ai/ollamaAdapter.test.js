import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { ollamaGenerate } from "../../src/ai/ollamaAdapter.js";
import { AiError } from "../../src/utils/errors.js";

test("ollamaAdapter: throws AI_UNREACHABLE when service is down or connection refused", async () => {
  // Use a port where no server is listening
  const unusedPort = 59999;
  const unreachableUrl = `http://127.0.0.1:${unusedPort}`;

  await assert.rejects(
    async () => {
      await ollamaGenerate({ prompt: "Hello", baseUrl: unreachableUrl });
    },
    (err) => {
      assert.ok(err instanceof AiError);
      assert.equal(err.code, "AI_UNREACHABLE");
      assert.match(err.message, /Failed to connect to local Ollama runtime/);
      return true;
    }
  );
});

test("ollamaAdapter: throws AI_SERVICE_UNAVAILABLE when service returns HTTP error status", async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal GPU OOM Error");
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const localUrl = `http://127.0.0.1:${port}`;

  try {
    await assert.rejects(
      async () => {
        await ollamaGenerate({ prompt: "Hello", baseUrl: localUrl });
      },
      (err) => {
        assert.ok(err instanceof AiError);
        assert.equal(err.code, "AI_SERVICE_UNAVAILABLE");
        assert.match(err.message, /Ollama service error: HTTP 500/);
        return true;
      }
    );
  } finally {
    server.close();
  }
});
