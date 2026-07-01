// Guest service — CRUD + batch import + dedup lintas-batch.
import { z } from "zod";
import { guestRepo } from "./guest.repo.js";
import { parseXlsx, generateQrToken, type ColumnMapping } from "./excel-parser.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import type { GuestInsert, GuestUpdate, GuestRow } from "./guest.types.js";

const idSchema = z.string().uuid();

const createSchema = z.object({
  fullName: z.string().min(1).max(200),
  category: z.enum(["VVIP", "VIP", "MEDIA", "REGULER", "STAFF"]).default("REGULER"),
  source: z.enum(["MANUAL", "IMPORT", "WALK_IN"]).default("MANUAL"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  plusOneCount: z.number().int().min(0).max(10).default(0),
  dietNotes: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = createSchema.partial();

export const guestService = {
  async list(
    eventId: string,
    opts: { category?: string; search?: string; limit?: number; offset?: number } = {},
  ) {
    const id = idSchema.parse(eventId);
    return guestRepo.listByEvent(id, opts);
  },

  async create(eventId: string, input: z.infer<typeof createSchema>): Promise<GuestRow> {
    const id = idSchema.parse(eventId);
    const p = createSchema.parse(input);
    const insert: GuestInsert = {
      event_id: id,
      full_name: p.fullName,
      category: p.category,
      source: p.source,
      email: p.email || undefined,
      phone: p.phone || undefined,
      plus_one_count: p.plusOneCount,
      diet_notes: p.dietNotes,
      notes: p.notes,
    };
    return guestRepo.create(insert);
  },

  async update(id: string, input: z.infer<typeof updateSchema>) {
    const id_ = idSchema.parse(id);
    const p = updateSchema.parse(input);
    const patch: GuestUpdate = {
      ...(p.fullName !== undefined ? { full_name: p.fullName } : {}),
      ...(p.email !== undefined ? { email: p.email || null } : {}),
      ...(p.phone !== undefined ? { phone: p.phone || null } : {}),
      ...(p.category !== undefined ? { category: p.category } : {}),
      ...(p.plusOneCount !== undefined ? { plus_one_count: p.plusOneCount } : {}),
      ...(p.dietNotes !== undefined ? { diet_notes: p.dietNotes } : {}),
      ...(p.notes !== undefined ? { notes: p.notes } : {}),
    };
    const row = await guestRepo.update(id_, patch);
    if (!row) throw new NotFoundError("Guest tidak ditemukan.");
    return row;
  },

  async remove(id: string) {
    const id_ = idSchema.parse(id);
    await guestRepo.softDelete(id_);
  },

  /**
   * Batch import Excel.
   * - Parse file dengan mapping
   * - Validasi tiap baris
   * - Insert yang valid (Postgres handle generate qr_token via DEFAULT)
   * - Return ringkasan: inserted/skipped/duplicates
   */
  async importFromExcel(
    eventId: string,
    buffer: Buffer,
    mapping: ColumnMapping,
  ): Promise<{
    inserted: number;
    skipped: number;
    invalid: { rowNumber: number; reason: string }[];
  }> {
    const id = idSchema.parse(eventId);
    const { valid, invalid } = await parseXlsx(buffer, mapping);
    if (valid.length === 0) {
      return {
        inserted: 0,
        skipped: invalid.length,
        invalid: invalid.map((r) => ({ rowNumber: r.rowNumber, reason: r.errors.join("; ") })),
      };
    }

    // Cek duplikat terhadap DB (by full_name case-insensitive)
    const { rows: existing } = await guestRepo.listByEvent(id, { limit: 1000 });
    const existingNames = new Set(existing.map((g) => g.full_name.toLowerCase()));
    const toInsert: GuestInsert[] = [];
    const skipped: { rowNumber: number; reason: string }[] = [];

    for (const r of valid) {
      const key = r.full_name.toLowerCase();
      if (existingNames.has(key)) {
        skipped.push({ rowNumber: r.rowNumber, reason: "Tamu sudah ada di DB" });
        continue;
      }
      existingNames.add(key);
      toInsert.push({
        event_id: id,
        full_name: r.full_name,
        category: r.category,
        source: "IMPORT",
        email: r.email,
        phone: r.phone,
        plus_one_count: r.plus_one_count,
        diet_notes: r.diet_notes,
        notes: r.notes,
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      // Insert dalam chunk 500 supaya tidak timeout
      const CHUNK = 500;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const batch = toInsert.slice(i, i + CHUNK);
        const created = await guestRepo.createBatch(batch);
        inserted += created.length;
      }
    }

    return {
      inserted,
      skipped: skipped.length + invalid.length,
      invalid: [
        ...invalid.map((r) => ({ rowNumber: r.rowNumber, reason: r.errors.join("; ") })),
        ...skipped,
      ],
    };
  },
};