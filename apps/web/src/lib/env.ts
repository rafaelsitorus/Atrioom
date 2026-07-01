import { z } from "zod";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

// Pakai optional + fallback manual agar `""` (empty string dari Next bundle)
// tetap dianggap "tidak di-set" dan diganti placeholder saat build.
const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  INTERNAL_API_BASE_URL: z.string().url().default("http://localhost:4000"),
});

const parsed = EnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  INTERNAL_API_BASE_URL: process.env.INTERNAL_API_BASE_URL,
});

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. See logs.");
}

const rawUrl = parsed.data.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

// Saat BUILD, terima apa adanya (placeholder pun boleh) — page-data collection
// tidak benar-benar menghubungi Supabase. Saat RUNTIME, placeholder akan
// menyebabkan Supabase request gagal — kita warn di sini.
const isPlaceholder = !rawUrl || !rawKey;

if (isPlaceholder && !isBuildPhase) {
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️  Supabase env vars belum di-set. Salin .env.example ke .env.local dan isi nilai asli sebelum menjalankan aplikasi.",
  );
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: rawUrl && rawUrl.length > 0 ? rawUrl : PLACEHOLDER_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: rawKey && rawKey.length > 0 ? rawKey : PLACEHOLDER_KEY,
  SUPABASE_SERVICE_ROLE_KEY: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  INTERNAL_API_BASE_URL: parsed.data.INTERNAL_API_BASE_URL,
} as const;