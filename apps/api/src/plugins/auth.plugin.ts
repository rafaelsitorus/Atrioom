// EPIC00 — Auth plugin untuk Fastify.
// Mendukung 2 cara verifikasi:
// 1. Authorization: Bearer <jwt>  (untuk client-side, scanner, dll)
// 2. Cookie sb-*-auth-token      (untuk Server Component Next.js dengan
//                                  @supabase/ssr yang forward cookie)
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { getSupabaseAdmin } from "../config/supabase.js";
import { UnauthorizedError } from "../shared/errors.js";
// Type augmentation ada di src/types/fastify.d.ts (auto-included oleh tsconfig).

/**
 * Extract access token dari cookie Supabase PKCE.
 * Cookie name pattern: `sb-<project-ref>-auth-token`.
 * Format @supabase/ssr v0.5+ : "base64-" + base64(JSON.stringify(session))
 * Format lama: URL-encoded JSON string.
 */
function extractTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";");
  for (const raw of cookies) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("sb-") || !trimmed.includes("-auth-token")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const rawValue = decodeURIComponent(trimmed.slice(eq + 1));

    // Format 1: "base64-<base64-of-JSON>" (Supabase SSR v0.5+)
    if (rawValue.startsWith("base64-")) {
      try {
        const decoded = Buffer.from(rawValue.slice(7), "base64").toString("utf8");
        const parsed = JSON.parse(decoded) as { access_token?: string };
        if (parsed.access_token) return parsed.access_token;
      } catch {
        // Fall through ke Format 2
      }
    }

    // Format 2: URL-encoded JSON (Supabase SSR older)
    try {
      const parsed = JSON.parse(rawValue) as { access_token?: string };
      if (parsed.access_token) return parsed.access_token;
    } catch {
      // Format 3: plain JWT
      if (rawValue.split(".").length === 3) return rawValue;
    }
  }
  return null;
}

const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorateRequest("user", undefined);

  fastify.decorate("verifyJwt", async (request: FastifyRequest) => {
    // 1) Prioritas: Authorization: Bearer <jwt>
    const header = request.headers.authorization ?? request.headers.Authorization;
    let token: string | null = null;

    if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
      token = header.slice(7).trim();
    }

    // 2) Fallback: cookie sb-*-auth-token
    if (!token) {
      const cookieHeader = request.headers.cookie;
      token = extractTokenFromCookie(cookieHeader);
    }

    if (!token) {
      throw new UnauthorizedError("Missing Authorization header or session cookie.");
    }

    // Verifikasi signature & expiry pakai admin client.
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data?.user) {
      throw new UnauthorizedError("Invalid or expired token.");
    }

    request.user = {
      id: data.user.id,
      email: data.user.email ?? null,
      accessToken: token,
    };
  });

  fastify.decorate("requireAuth", async (request: FastifyRequest) => {
    await fastify.verifyJwt(request);
  });
};

export default fp(authPlugin, { name: "auth" });