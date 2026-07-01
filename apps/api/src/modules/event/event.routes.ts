// Routes untuk Event module — semua butuh auth.
import "../../types/fastify";
import type { FastifyPluginAsync } from "fastify";
import { eventService } from "./event.service";
import { UnauthorizedError } from "../../shared/errors";
import { z } from "zod";

const listQuerySchema = z.object({
  orgId: z.string().uuid().optional(),
  includeArchived: z.coerce.boolean().optional(),
});

const createBodySchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(200),
  venue: z.string().max(200).optional(),
  capacity: z.number().int().positive().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "LIVE", "CLOSED"]).optional(),
});

const updateBodySchema = createBodySchema.partial().omit({ orgId: true });

const duplicateBodySchema = z.object({
  newName: z.string().min(1).max(200),
});

export const eventRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/v1/events",
    { preHandler: fastify.requireAuth },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();
      const q = listQuerySchema.parse(request.query);
      return eventService.list({
        orgId: q.orgId,
        includeArchived: q.includeArchived,
      });
    },
  );

  fastify.get(
    "/v1/events/:id",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { id } = request.params as { id: string };
      return eventService.getById(id);
    },
  );

  fastify.post(
    "/v1/events",
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      if (!request.user) throw new UnauthorizedError();
      const body = createBodySchema.parse(request.body);
      const ev = await eventService.create(body, request.user.id);
      return reply.status(201).send(ev);
    },
  );

  fastify.patch(
    "/v1/events/:id",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = updateBodySchema.parse(request.body);
      return eventService.update(id, body);
    },
  );

  fastify.post(
    "/v1/events/:id/archive",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { id } = request.params as { id: string };
      return eventService.archive(id);
    },
  );

  fastify.post(
    "/v1/events/:id/duplicate",
    { preHandler: fastify.requireAuth },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();
      const { id } = request.params as { id: string };
      const body = duplicateBodySchema.parse(request.body);
      const dup = await eventService.duplicate(id, body.newName, request.user.id);
      return dup;
    },
  );

  fastify.delete(
    "/v1/events/:id",
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await eventService.remove(id);
      return reply.status(204).send();
    },
  );
};

export default eventRoutes;