// Supabase admin & user-scoped clients.
// Admin: service-role, HANYA dipakai di server (lewati RLS, bypass auth).
// User : anon-key + JWT user, dipakai ketika ingin RLS aktif.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

let adminCached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminCached) return adminCached;
  adminCached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminCached;
}

/**
 * Buat klien Supabase yang scoped ke user tertentu (forward JWT).
 * RLS aktif berdasarkan auth.uid() = user.id.
 */
export function getSupabaseForUser(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}