// Supabase untuk CLIENT COMPONENTS ("use client").
// Browser singleton — buat sekali per sesi tab.
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "../env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cached) return cached;
  cached = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return cached;
}