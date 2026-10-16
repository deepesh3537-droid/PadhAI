import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../utils/errors.js";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

/**
 * Authentication middleware that verifies the Supabase JWT Bearer token
 * and attaches the authenticated user object to req.user.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or malformed Authorization header"));
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next(new UnauthorizedError("Bearer token missing"));
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return next(new UnauthorizedError("Invalid or expired session token"));
    }

    req.user = user;
    next();
  } catch (err) {
    return next(new UnauthorizedError("Failed to authenticate token"));
  }
}

export default requireAuth;
