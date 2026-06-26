import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ALLOWED_ORIGINS: z.string().default(""),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid backend environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid backend environment variables. See logs.");
}

export const env = parsed.data;
export const allowedOrigins = parsed.data.ALLOWED_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);