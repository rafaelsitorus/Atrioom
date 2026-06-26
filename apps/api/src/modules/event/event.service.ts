// Event service — orkestrasi business logic (validasi, duplikasi, dll).
import { z } from "zod";
import { eventRepo } from "./event.repo";
import { NotFoundError } from "../../shared/errors";

const idSchema = z.string().uuid();

const createSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(200),
  venue: z.string().max(200).optional(),
  capacity: z.number().int().positive().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "LIVE", "CLOSED"]).optional(),
});

const updateSchema = createSchema.partial().omit({ orgId: true });

export const eventService = {
  async list(opts: { orgId?: string; includeArchived?: boolean }) {
    return eventRepo.list(opts);
  },

  async getById(id: string) {
    const id_ = idSchema.parse(id);
    const ev = await eventRepo.findById(id_);
    if (!ev) throw new NotFoundError("Event tidak ditemukan.");
    return ev;
  },

  async create(input: z.infer<typeof createSchema>, createdBy: string) {
    const parsed = createSchema.parse(input);
    return eventRepo.create({
      org_id: parsed.orgId,
      name: parsed.name,
      venue: parsed.venue ?? null,
      capacity: parsed.capacity ?? null,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt ?? null,
      status: parsed.status ?? "DRAFT",
      created_by: createdBy,
    });
  },

  async update(id: string, input: z.infer<typeof updateSchema>) {
    const id_ = idSchema.parse(id);
    const parsed = updateSchema.parse(input);
    return eventRepo.update(id_, {
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.venue !== undefined ? { venue: parsed.venue ?? null } : {}),
      ...(parsed.capacity !== undefined ? { capacity: parsed.capacity ?? null } : {}),
      ...(parsed.startsAt !== undefined ? { starts_at: parsed.startsAt } : {}),
      ...(parsed.endsAt !== undefined ? { ends_at: parsed.endsAt ?? null } : {}),
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    });
  },

  async archive(id: string) {
    const id_ = idSchema.parse(id);
    return eventRepo.archive(id_);
  },

  async duplicate(id: string, newName: string, createdBy: string) {
    const id_ = idSchema.parse(id);
    return eventRepo.duplicate(id_, newName, createdBy);
  },

  async remove(id: string) {
    const id_ = idSchema.parse(id);
    await eventRepo.softDelete(id_);
  },
};