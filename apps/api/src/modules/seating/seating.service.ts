// Seating service — business logic + invariant enforcement + audit + undo.
import { z } from "zod";
import { seatingRepo } from "./seating.repo.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors.js";
import type { SeatingAction } from "./seating.types.js";

const idSchema = z.string().uuid();

const createTableSchema = z.object({
  eventId: z.string().uuid(),
  label: z.string().min(1).max(50),
  capacity: z.number().int().min(1).max(50),
  posX: z.number().default(0),
  posY: z.number().default(0),
  shape: z.enum(["ROUND", "RECTANGULAR", "LONG"]).default("ROUND"),
  notes: z.string().max(500).optional(),
});

const assignSchema = z.object({
  seatId: z.string().uuid(),
  guestId: z.string().uuid(),
});

export const seatingService = {
  // ── Tables ────────────────────────────────────────────────────────────────
  async listTables(eventId: string) {
    const id = idSchema.parse(eventId);
    return seatingRepo.listTables(id);
  },

  async createTable(input: z.infer<typeof createTableSchema>) {
    const p = createTableSchema.parse(input);
    return seatingRepo.createTable({
      event_id: p.eventId,
      label: p.label,
      capacity: p.capacity,
      pos_x: p.posX ?? 0,
      pos_y: p.posY ?? 0,
      shape: p.shape ?? "ROUND",
      notes: p.notes ?? null,
    });
  },

  async updateTable(id: string, patch: { label?: string; capacity?: number; posX?: number; posY?: number; shape?: "ROUND" | "RECTANGULAR" | "LONG"; notes?: string | null }) {
    const id_ = idSchema.parse(id);
    return seatingRepo.updateTable(id_, {
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
      ...(patch.posX !== undefined ? { pos_x: patch.posX } : {}),
      ...(patch.posY !== undefined ? { pos_y: patch.posY } : {}),
      ...(patch.shape !== undefined ? { shape: patch.shape } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    });
  },

  async deleteTable(id: string) {
    const id_ = idSchema.parse(id);
    await seatingRepo.deleteTable(id_);
  },

  /**
   * Generate seats for a table secara otomatis.
   * Untuk ROUND: kursi disusun melingkar.
   * Untuk RECTANGULAR/LONG: kursi dalam baris.
   */
  async generateSeatsForTable(tableId: string, count: number) {
    const table = await seatingRepo.updateTable(tableId, {}); // fetch via listTables kalau perlu
    // Ambil table via update tidak efisien; pakai pendekatan langsung:
    // Karena ini internal, kita re-fetch lewat query sederhana:
    const id = idSchema.parse(tableId);
    if (count < 1 || count > 50) throw new ValidationError("Jumlah kursi 1–50.");

    // Generate seats coordinates relatif ke table anchor (radius 60 untuk ROUND)
    const seats: Omit<import("./seating.types").SeatRow, "id" | "created_at" | "updated_at" | "row_version" | "deleted_at">[] = [];
    if (table.shape === "ROUND") {
      const r = 60;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        seats.push({
          table_id: id,
          seat_label: `${table.label}-${String.fromCharCode(65 + i)}`, // T1-A, T1-B
          pos_x: Math.cos(angle) * r,
          pos_y: Math.sin(angle) * r,
        });
      }
    } else {
      // Rectangular: baris di atas & bawah
      const cols = Math.ceil(count / 2);
      const colW = 40;
      for (let i = 0; i < count; i++) {
        const row = i < cols ? 0 : 1;
        const col = i % cols;
        seats.push({
          table_id: id,
          seat_label: `${table.label}-${String.fromCharCode(65 + i)}`,
          pos_x: (col - (cols - 1) / 2) * colW,
          pos_y: row === 0 ? -40 : 40,
        });
      }
    }
    return seatingRepo.createSeatsBulk(seats);
  },

  async listSeatsByEvent(eventId: string) {
    const id = idSchema.parse(eventId);
    return seatingRepo.listSeatsByEvent(id);
  },

  async listAssignments(eventId: string) {
    const id = idSchema.parse(eventId);
    return seatingRepo.listActiveAssignments(id);
  },

  // ── Assign / Unassign (dengan audit + invariant) ─────────────────────────
  /**
   * Assign guest ke seat. Aturan:
   * - Seat belum terisi tamu lain (UNIQUE active per seat).
   * - Guest belum duduk di seat lain (UNIQUE active per guest) → jika sudah, unassign dulu.
   * - Catat audit row.
   * - Return assignment baru.
   */
  async assignGuest(eventId: string, input: z.infer<typeof assignSchema>, actorUserId: string) {
    const id = idSchema.parse(eventId);
    const p = assignSchema.parse(input);

    // Pre-check: seat & guest exist
    const seat = await seatingRepo.findSeatById(p.seatId);
    if (!seat) throw new NotFoundError("Seat tidak ditemukan.");

    // Cek apakah seat sudah terisi
    const existingOnSeat = await seatingRepo.findActiveAssignmentBySeat(p.seatId);
    if (existingOnSeat) {
      throw new ConflictError("Kursi sudah terisi tamu lain.", {
        seatId: p.seatId,
        currentGuestId: existingOnSeat.guest_id,
      });
    }

    // Cek apakah guest sudah duduk di seat lain (move case)
    const existingForGuest = await seatingRepo.findActiveAssignmentByGuest(p.guestId);
    let fromSeatId: string | null = null;
    let fromTableId: string | null = null;
    if (existingForGuest) {
      fromSeatId = existingForGuest.seat_id;
      const fromTable = await seatingRepo.findTableBySeat(existingForGuest.seat_id);
      fromTableId = fromTable?.id ?? null;
      await seatingRepo.softDeleteAssignment(existingForGuest.id);
    }

    // Insert assignment baru
    const toTable = await seatingRepo.findTableBySeat(p.seatId);
    const assignment = await seatingRepo.insertAssignment({
      event_id: id,
      seat_id: p.seatId,
      guest_id: p.guestId,
      assigned_by: actorUserId,
    });

    // Audit
    const action: SeatingAction = existingForGuest ? "MOVE" : "ASSIGN";
    await seatingRepo.insertAudit({
      event_id: id,
      actor_user_id: actorUserId,
      action,
      guest_id: p.guestId,
      from_seat_id: fromSeatId,
      to_seat_id: p.seatId,
      from_table_id: fromTableId,
      to_table_id: toTable?.id ?? null,
      metadata: null,
    });

    return assignment;
  },

  async unassignGuest(eventId: string, seatId: string, actorUserId: string) {
    const id = idSchema.parse(eventId);
    const seatId_ = idSchema.parse(seatId);

    const existing = await seatingRepo.findActiveAssignmentBySeat(seatId_);
    if (!existing) throw new NotFoundError("Tidak ada tamu di kursi ini.");

    await seatingRepo.softDeleteAssignment(existing.id);

    const fromTable = await seatingRepo.findTableBySeat(seatId_);
    await seatingRepo.insertAudit({
      event_id: id,
      actor_user_id: actorUserId,
      action: "UNASSIGN",
      guest_id: existing.guest_id,
      from_seat_id: seatId_,
      to_seat_id: null,
      from_table_id: fromTable?.id ?? null,
      to_table_id: null,
      metadata: null,
    });

    return { ok: true };
  },

  // ── Undo ─────────────────────────────────────────────────────────────────
  /**
   * Undo perubahan seating terakhir pada event.
   * Catatan: undo adalah GLOBAL per event (siapa pun boleh undo perubahan
   * terakhir, supaya operator tidak terkunci jika admin salah klik).
   */
  async undoLast(eventId: string, actorUserId: string) {
    const id = idSchema.parse(eventId);
    const last = await seatingRepo.findLatestUndoneAudit(id);
    if (!last) throw new NotFoundError("Tidak ada perubahan yang bisa di-undo.");

    let restored;
    if (last.action === "ASSIGN") {
      // Inverse: unassign seat_to
      const existing = await seatingRepo.findActiveAssignmentBySeat(last.to_seat_id!);
      if (existing) {
        await seatingRepo.softDeleteAssignment(existing.id);
        restored = { action: "unassigned", guestId: existing.guest_id };
      } else {
        restored = { action: "noop", note: "assignment sudah tidak aktif" };
      }
    } else if (last.action === "UNASSIGN") {
      // Inverse: re-assign guest dari from_seat
      if (!last.from_seat_id || !last.guest_id) {
        throw new ValidationError("Audit row tidak punya informasi yang cukup untuk undo.");
      }
      restored = await seatingRepo.insertAssignment({
        event_id: id,
        seat_id: last.from_seat_id,
        guest_id: last.guest_id,
        assigned_by: actorUserId,
      });
    } else if (last.action === "MOVE") {
      // Inverse: pindahkan kembali ke from_seat
      if (!last.from_seat_id || !last.guest_id) {
        throw new ValidationError("Audit row tidak punya informasi yang cukup untuk undo.");
      }
      // Hapus assignment aktif saat ini
      const current = await seatingRepo.findActiveAssignmentByGuest(last.guest_id);
      if (current) await seatingRepo.softDeleteAssignment(current.id);
      // Buat ulang di from_seat
      restored = await seatingRepo.insertAssignment({
        event_id: id,
        seat_id: last.from_seat_id,
        guest_id: last.guest_id,
        assigned_by: actorUserId,
      });
    }

    await seatingRepo.markAuditUndone(last.id, actorUserId);
    return { undone: last.action, restored };
  },
};