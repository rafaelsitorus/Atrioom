// Routes EPIC00 — verifikasi sesi & info user.
// Endpoint publik minimal: /v1/auth/me untuk cek token masih valid.
import type { FastifyPluginAsync } from "fastify";
import { UnauthorizedError } from "../../shared/errors.js";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Endpoint terproteksi — preHandler requireAuth sudah verifikasi token
  fastify.get(
    "/v1/auth/me",
    { preHandler: fastify.requireAuth },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();
      return {
        user: {
          id: request.user.id,
          email: request.user.email,
        },
      };
    },
  );
};

export default authRoutes;