import test from "node:test";
import assert from "node:assert/strict";
import { getSupabaseClient, supabaseServer } from "../../src/db/supabaseAdmin.js";

test("getSupabaseClient returns default supabaseServer when no token is provided", () => {
  const client = getSupabaseClient();
  assert.equal(client, supabaseServer);
});

test("getSupabaseClient creates user-scoped client with Authorization header when token is provided", () => {
  const token = "mock-user-jwt-token";
  const client = getSupabaseClient(token);

  assert.notEqual(client, supabaseServer);
  assert.ok(client);
  // Verify client can be called
  assert.equal(typeof client.from, "function");
});
