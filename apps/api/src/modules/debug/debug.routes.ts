// Debug endpoint — return info tentang request untuk diagnosis.
// Hapus setelah masalah terselesaikan.
import type { FastifyPluginAsync } from "fastify";

export const debugRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/v1/debug/request", async (request) => {
    return {
      url: request.url,
      method: request.method,
      headers: {
        cookie: request.headers.cookie ?? null,
        authorization: request.headers.authorization ?? null,
        origin: request.headers.origin ?? null,
        "user-agent": request.headers["user-agent"] ?? null,
      },
      cookies: parseCookieHeader(request.headers.cookie),
    };
  });
};

function parseCookieHeader(header: string | undefined): Array<{ name: string; valueLength: number }> {
  if (!header) return [];
  return header
    .split(";")
    .map((c) => {
      const [name, value] = c.trim().split("=");
      return { name: name?.trim() ?? "", valueLength: value?.length ?? 0 };
    })
    .filter((c) => c.name);
}

export default debugRoutes;