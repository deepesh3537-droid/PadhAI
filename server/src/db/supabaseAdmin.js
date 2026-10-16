import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

// Use service role key if present, otherwise fallback to anon key for server-scoped queries
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

export const supabaseServer = createClient(env.SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

/**
 * Creates or retrieves a Supabase client.
 * When a user token is provided, creates a user-scoped client that forwards
 * the JWT in Authorization headers so that PostgREST queries run as the `authenticated`
 * role and evaluate RLS policies (`auth.uid() = user_id`).
 * When no token is provided, falls back to the server admin client.
 *
 * @param {string} [token] - Supabase Auth access token
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export function getSupabaseClient(token) {
  if (token) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  return supabaseServer;
}

export default supabaseServer;
