// Routes untuk Guest module.
import type { FastifyPluginAsync } from "fastify";
import { guestService } from "./guest.service.js";
import { z } from "zod";
import { ValidationError } from "../../shared/errors.js";

const listQuerySchema = z.object({
  category: z.enum(["VVIP", "VIP", "MEDIA", "REGULER", "STAFF"]).optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const createBodySchema = z.object({
  fullName: z.string().min(1).max(200),
  category: z.enum(["VVIP", "VIP", "MEDIA", "REGULER", "STAFF"]).default("REGULER"),
  source: z.enum(["MANUAL", "IMPORT", "WALK_IN"]).default("MANUAL"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  plusOneCount: z.number().int().min(0).max(10).default(0),
  dietNotes: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

const updateBodySchema = createBodySchema.partial();

const importMappingSchema = z.object({
  fullName: z.string().min(1),
  category: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  plusOneCount: z.string().optional(),
  dietNotes: z.string().optional(),
  notes: z.string().optional(),
});

export const guestRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/v1/events/:eventId/guests",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { eventId } = request.params as { eventId: string };
      const q = listQuerySchema.parse(request.query);
      return guestService.list(eventId, q);
    },
  );

  fastify.post(
    "/v1/events/:eventId/guests",
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const body = createBodySchema.parse(request.body);
      const g = await guestService.create(eventId, body);
      return reply.status(201).send(g);
    },
  );

  fastify.patch(
    "/v1/guests/:id",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = updateBodySchema.parse(request.body);
      return guestService.update(id, body);
    },
  );

  fastify.delete(
    "/v1/guests/:id",
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await guestService.remove(id);
      return reply.status(204).send();
    },
  );

  // Batch import — multipart dengan field `file` (xlsx) + JSON field `mapping`
  fastify.post(
    "/v1/events/:eventId/guests/import",
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };

      // Ambil file dari multipart
      const file = await request.file();
      if (!file) throw new ValidationError("Field 'file' wajib di-upload.");
      if (!/\.xlsx$|\.xls$/i.test(file.filename ?? "")) {
        throw new ValidationError("File harus berformat .xlsx atau .xls.");
      }
      const buf = await file.toBuffer();
      if (buf.length === 0) throw new ValidationError("File kosong.");

      // Mapping datang sebagai field JSON string
      const mappingField = file.fields.mapping;
      let mappingJson: unknown;
      if (typeof mappingField === "string") {
        try {
          mappingJson = JSON.parse(mappingField);
        } catch {
          throw new ValidationError("Field 'mapping' harus JSON valid.");
        }
      } else if (mappingField && typeof mappingField === "object" && "value" in mappingField) {
        const v = (mappingField as { value: string }).value;
        try {
          mappingJson = JSON.parse(v);
        } catch {
          throw new ValidationError("Field 'mapping' harus JSON valid.");
        }
      } else {
        throw new ValidationError("Field 'mapping' wajib diisi.");
      }

      const mapping = importMappingSchema.parse(mappingJson);
      const result = await guestService.importFromExcel(eventId, buf, mapping);
      return reply.status(200).send(result);
    },
  );
};

export default guestRoutes;