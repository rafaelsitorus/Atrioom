// Supabase admin & user-scoped clients.
// Admin: service-role, HANYA dipakai di server (lewati RLS, bypass auth).
// User : anon-key + JWT user, dipakai ketika ingin RLS aktif.
//
// Node 20 fix: provide global WebSocket via 'ws' package. Tanpa ini,
// @supabase/realtime-js v2.x crash karena Node 20 tidak punya WebSocket
// native. Kita tidak pakai realtime di backend (frontend yang handle via
// Vercel browser), tapi library tetap create WebSocket instance di
// constructor → crash. Solusi: override global WebSocket dengan 'ws'.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import WebSocket from "ws";

// Polyfill global WebSocket — @supabase/realtime-js pakai ini
// secara internal. 'ws' package adalah implementasi WebSocket untuk Node.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

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