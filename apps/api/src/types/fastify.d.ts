// Global type augmentation untuk Fastify — agar decorator dari plugin
// (auth.plugin.ts) dikenali di seluruh route modules.
import "fastify";
import type { FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string | null;
      accessToken: string;
    };
  }
  interface FastifyInstance {
    verifyJwt: (request: FastifyRequest) => Promise<void>;
    requireAuth: (request: FastifyRequest) => Promise<void>;
  }
}

// @fastify/multipart: tambah `request.file()` dan `request.parts()`
declare module "fastify" {
  interface FastifyRequest {
    file: () => Promise<import("@fastify/multipart").MultipartFile | undefined>;
  }
}