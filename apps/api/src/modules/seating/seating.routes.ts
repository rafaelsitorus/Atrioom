// Routes untuk Seating module.
import type { FastifyPluginAsync } from "fastify";
import { seatingService } from "./seating.service.js";
import { UnauthorizedError } from "../../shared/errors.js";
import { z } from "zod";

const createTableBody = z.object({
  eventId: z.string().uuid(),
  label: z.string().min(1).max(50),
  capacity: z.number().int().min(1).max(50),
  posX: z.number().optional(),
  posY: z.number().optional(),
  shape: z.enum(["ROUND", "RECTANGULAR", "LONG"]).optional(),
  notes: z.string().max(500).optional(),
});

const updateTableBody = z.object({
  label: z.string().min(1).max(50).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  posX: z.number().optional(),
  posY: z.number().optional(),
  shape: z.enum(["ROUND", "RECTANGULAR", "LONG"]).optional(),
  notes: z.string().max(500).nullable().optional(),
});

const generateSeatsBody = z.object({ count: z.number().int().min(1).max(50) });

const assignBody = z.object({
  seatId: z.string().uuid(),
  guestId: z.string().uuid(),
});

export const seatingRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Tables ────────────────────────────────────────────────────────────────
  fastify.get(
    "/v1/events/:eventId/tables",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { eventId } = request.params as { eventId: string };
      return seatingService.listTables(eventId);
    },
  );

  fastify.post(
    "/v1/events/:eventId/tables",
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const raw = (request.body ?? {}) as Record<string, unknown>;
      const body = {
        eventId,
        label: String(raw.label ?? ""),
        capacity: Number(raw.capacity),
        posX: raw.posX !== undefined ? Number(raw.posX) : 0,
        posY: raw.posY !== undefined ? Number(raw.posY) : 0,
        shape: (raw.shape as "ROUND" | "RECTANGULAR" | "LONG" | undefined) ?? "ROUND",
        notes: raw.notes !== undefined ? String(raw.notes) : undefined,
      };
      const parsed = createTableBody.parse(body);
      const t = await seatingService.createTable({
        ...parsed,
        posX: parsed.posX ?? 0,
        posY: parsed.posY ?? 0,
        shape: parsed.shape ?? "ROUND",
      });
      return reply.status(201).send(t);
    },
  );

  fastify.patch(
    "/v1/tables/:id",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = updateTableBody.parse(request.body);
      return seatingService.updateTable(id, body);
    },
  );

  fastify.delete(
    "/v1/tables/:id",
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await seatingService.deleteTable(id);
      return reply.status(204).send();
    },
  );

  // ── Seats ─────────────────────────────────────────────────────────────────
  fastify.get(
    "/v1/events/:eventId/seats",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { eventId } = request.params as { eventId: string };
      return seatingService.listSeatsByEvent(eventId);
    },
  );

  fastify.post(
    "/v1/tables/:id/seats/generate",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = generateSeatsBody.parse(request.body);
      return seatingService.generateSeatsForTable(id, body.count);
    },
  );

  // ── Assignments ───────────────────────────────────────────────────────────
  fastify.get(
    "/v1/events/:eventId/assignments",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { eventId } = request.params as { eventId: string };
      return seatingService.listAssignments(eventId);
    },
  );

  fastify.post(
    "/v1/events/:eventId/assignments",
    { preHandler: fastify.requireAuth },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();
      const { eventId } = request.params as { eventId: string };
      const body = assignBody.parse(request.body);
      const assignment = await seatingService.assignGuest(eventId, body, request.user.id);
      return assignment;
    },
  );

  fastify.delete(
    "/v1/events/:eventId/seats/:seatId/assignment",
    { preHandler: fastify.requireAuth },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();
      const { eventId, seatId } = request.params as { eventId: string; seatId: string };
      return seatingService.unassignGuest(eventId, seatId, request.user.id);
    },
  );

  // ── Undo ──────────────────────────────────────────────────────────────────
  fastify.post(
    "/v1/events/:eventId/seating/undo",
    { preHandler: fastify.requireAuth },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();
      const { eventId } = request.params as { eventId: string };
      return seatingService.undoLast(eventId, request.user.id);
    },
  );
};

export default seatingRoutes;