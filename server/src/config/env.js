import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env relative to this config file first, then fallback to cwd .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const isTest = process.env.NODE_ENV === "test";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),

  // Supabase (test fallback allowed for automated unit test runs)
  SUPABASE_URL: z
    .string()
    .url({ message: "SUPABASE_URL must be a valid URL" })
    .default(isTest ? "https://placeholder-test.supabase.co" : undefined),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1, { message: "SUPABASE_ANON_KEY is required" })
    .default(isTest ? "placeholder-test-key" : undefined),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),

  // Ollama
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("qwen3:0.6b"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(120000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().default(1500),
  AI_MAX_RETRIES: z.coerce.number().default(2),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(60),
  RATE_LIMIT_AI_MAX_REQUESTS: z.coerce.number().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export default env;
