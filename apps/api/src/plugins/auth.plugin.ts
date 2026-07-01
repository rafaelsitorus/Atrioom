// EPIC00 — Auth plugin untuk Fastify.
// Memverifikasi JWT Supabase dari header Authorization, menempelkan user ke request.
// Cara pakai:
//   fastify.get('/v1/protected', { preHandler: fastify.requireAuth }, async (req) => {
//     return { user: req.user };
//   });
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { getSupabaseAdmin } from "../config/supabase.js";
import { UnauthorizedError } from "../shared/errors.js";
// Type augmentation ada di src/types/fastify.d.ts (auto-included oleh tsconfig).

const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // decorate: ambil & verifikasi token, set req.user
  fastify.decorateRequest("user", undefined);

  fastify.decorate("verifyJwt", async (request: FastifyRequest) => {
    const header = request.headers.authorization ?? request.headers.Authorization;
    if (!header || typeof header !== "string") {
      throw new UnauthorizedError("Missing Authorization header.");
    }

    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      throw new UnauthorizedError("Authorization header must use Bearer scheme.");
    }

    // Pakai admin client HANYA untuk verifikasi signature & expiry.
    // Kita tidak membaca data user via service-role ke tabel lain.
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

  // preHandler reusable untuk route yang butuh auth
  fastify.decorate("requireAuth", async (request: FastifyRequest) => {
    await fastify.verifyJwt(request);
  });
};

export default fp(authPlugin, { name: "auth" });