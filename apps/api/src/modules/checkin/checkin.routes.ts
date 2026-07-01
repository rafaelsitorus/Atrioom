// Routes check-in.
import "../../types/fastify";
import type { FastifyPluginAsync } from "fastify";
import { checkinService } from "./checkin.service.js";
import { UnauthorizedError } from "../../shared/errors.js";

export const checkinRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/events/:eventId/checkin  — by QR scan
  fastify.post(
    "/v1/events/:eventId/checkin",
    { preHandler: fastify.requireAuth },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();
      const { eventId } = request.params as { eventId: string };
      const body = (request.body ?? {}) as { qrToken?: string; deviceFingerprint?: string };
      return checkinService.checkInByQr(eventId, {
        qrToken: String(body.qrToken ?? ""),
        deviceFingerprint: String(body.deviceFingerprint ?? ""),
      }, request.user.id);
    },
  );

  // POST /v1/events/:eventId/walkin  — combo add guest + checkin
  fastify.post(
    "/v1/events/:eventId/walkin",
    { preHandler: fastify.requireAuth },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();
      const { eventId } = request.params as { eventId: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      return checkinService.walkInAndCheckIn(eventId, {
        fullName: String(body.fullName ?? ""),
        category: (body.category as "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF" | undefined) ?? "REGULER",
        email: body.email !== undefined ? String(body.email) : undefined,
        phone: body.phone !== undefined ? String(body.phone) : undefined,
        plusOneCount: body.plusOneCount !== undefined ? Number(body.plusOneCount) : 0,
        dietNotes: body.dietNotes !== undefined ? String(body.dietNotes) : undefined,
        deviceFingerprint: String(body.deviceFingerprint ?? ""),
      }, request.user.id);
    },
  );

  // GET /v1/events/:eventId/checkins/recent — list untuk dashboard
  fastify.get(
    "/v1/events/:eventId/checkins/recent",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { eventId } = request.params as { eventId: string };
      const q = (request.query ?? {}) as { limit?: string };
      const limit = q.limit ? Number(q.limit) : 50;
      return checkinService.listRecent(eventId, limit);
    },
  );

  // GET /v1/events/:eventId/checkins/stats — total success
  fastify.get(
    "/v1/events/:eventId/checkins/stats",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { eventId } = request.params as { eventId: string };
      return checkinService.getStats(eventId);
    },
  );
};

export default checkinRoutes;