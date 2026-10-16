import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistDir = path.resolve(__dirname, "../../../client/dist");

test("Security check: client build bundle does not contain SUPABASE_SERVICE_ROLE_KEY or backend secrets", () => {
  if (!fs.existsSync(clientDistDir)) {
    // If not built yet, skip
    return;
  }

  const jsFiles = fs.readdirSync(path.join(clientDistDir, "assets")).filter((f) => f.endsWith(".js"));
  assert.ok(jsFiles.length > 0, "Client build output should contain JS files");

  for (const jsFile of jsFiles) {
    const content = fs.readFileSync(path.join(clientDistDir, "assets", jsFile), "utf-8");
    assert.equal(
      content.includes("SUPABASE_SERVICE_ROLE_KEY"),
      false,
      `Bundle ${jsFile} must not leak SUPABASE_SERVICE_ROLE_KEY`
    );
    // Ensure service role key values aren't in bundle
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      assert.equal(
        content.includes(process.env.SUPABASE_SERVICE_ROLE_KEY),
        false,
        `Bundle ${jsFile} contains actual service role key string`
      );
    }
  }
});
