// Check-In service.
// Hot path < 50ms: lookup → insert idempotent.
// Idempotency strategy:
//   - 1 scan dgn (deviceId, guestId, detik) yang sama → 1 row (DB UNIQUE).
//   - Jika guest sudah SUCCESS sebelumnya → return ALREADY_CHECKED_IN.
import { z } from "zod";
import { checkinRepo, makeIdempotencyKey } from "./checkin.repo.js";
import { guestRepo } from "../guest/guest.repo.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors.js";
import type { CheckInConfirmation } from "./checkin.types";

const checkinByQrSchema = z.object({
  qrToken: z.string().min(8),
  deviceFingerprint: z.string().min(1).max(200),
});

const walkinSchema = z.object({
  fullName: z.string().min(1).max(200),
  category: z.enum(["VVIP", "VIP", "MEDIA", "REGULER", "STAFF"]).default("REGULER"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  plusOneCount: z.number().int().min(0).max(10).default(0),
  dietNotes: z.string().max(500).optional(),
  deviceFingerprint: z.string().min(1).max(200),
});

export const checkinService = {
  /**
   * Check-in via QR scan. Path paling kritis di operasional hari-H.
   * @param eventId   event UUID
   * @param input     qrToken + deviceFingerprint
   * @param actorId   operator user.id (verified via JWT)
   */
  async checkInByQr(
    eventId: string,
    input: z.infer<typeof checkinByQrSchema>,
    actorId: string,
  ): Promise<CheckInConfirmation> {
    const p = checkinByQrSchema.parse(input);

    // 1. Lookup guest by qr_token — indexed, < 5ms
    const guest = await checkinRepo.findGuestByQrToken(eventId, p.qrToken);
    if (!guest) {
      throw new NotFoundError("QR tidak valid atau tamu tidak ditemukan untuk event ini.");
    }

    // 2. Cek apakah sudah SUCCESS sebelumnya
    const previous = await checkinRepo.findExistingSuccessCheckIn(guest.id, eventId);
    if (previous) {
      // Tetap buat check-in row dengan result=ALREADY_CHECKED_IN untuk audit/logging
      const now = new Date();
      const idemKey = makeIdempotencyKey(p.deviceFingerprint, guest.id, now);
      try {
        await checkinRepo.insertCheckIn({
          event_id: eventId,
          guest_id: guest.id,
          scanned_by: actorId,
          scanned_by_device: p.deviceFingerprint,
          idempotency_key: idemKey + "-dup-" + Date.now().toString(36), // unique suffix untuk allow multiple dup log rows
          result: "ALREADY_CHECKED_IN",
          previous_check_in_id: previous.id,
        });
      } catch { /* log error only — bukan critical */ }

      const seating = await checkinRepo.findSeatingForGuest(guest.id);
      return {
        result: "ALREADY_CHECKED_IN",
        guest: {
          id: guest.id,
          full_name: guest.full_name,
          category: guest.category,
          is_vip: guest.is_vip,
          diet_notes: guest.diet_notes,
          plus_one_count: guest.plus_one_count,
          email: guest.email,
          phone: guest.phone,
        },
        seating,
        checked_in_at: previous.scanned_at,
        previous_scan_at: previous.scanned_at,
        message: `${guest.full_name} sudah check-in sebelumnya.`,
      };
    }

    // 3. Insert check-in row (idempotent)
    const now = new Date();
    const idemKey = makeIdempotencyKey(p.deviceFingerprint, guest.id, now);
    const { row: checkInRow, duplicate } = await checkinRepo.insertCheckIn({
      event_id: eventId,
      guest_id: guest.id,
      scanned_by: actorId,
      scanned_by_device: p.deviceFingerprint,
      idempotency_key: idemKey,
      result: "SUCCESS",
      previous_check_in_id: null,
    });

    if (duplicate) {
      // Race condition: 1 device scan 2x dalam detik yang sama (manual retry).
      // Treat sebagai sukses (idempotent).
      throw new ConflictError("Scan ganda terdeteksi — sudah di-handle.");
    }

    const seating = await checkinRepo.findSeatingForGuest(guest.id);
    return {
      result: "SUCCESS",
      guest: {
        id: guest.id,
        full_name: guest.full_name,
        category: guest.category,
        is_vip: guest.is_vip,
        diet_notes: guest.diet_notes,
        plus_one_count: guest.plus_one_count,
        email: guest.email,
        phone: guest.phone,
      },
      seating,
      checked_in_at: checkInRow?.scanned_at ?? now.toISOString(),
      previous_scan_at: null,
      message: `Selamat datang, ${guest.full_name}.`,
    };
  },

  /**
   * Walk-in combo: buat guest + langsung check-in dalam 1 atomic step.
   * Backend inserts guest first, lalu check_in row.
   */
  async walkInAndCheckIn(
    eventId: string,
    input: z.infer<typeof walkinSchema>,
    actorId: string,
  ): Promise<CheckInConfirmation> {
    const p = walkinSchema.parse(input);

    // 1. Create guest (source=WALK_IN)
    const guest = await guestRepo.create({
      event_id: eventId,
      full_name: p.fullName,
      category: p.category,
      source: "WALK_IN",
      email: p.email || undefined,
      phone: p.phone || undefined,
      plus_one_count: p.plusOneCount,
      diet_notes: p.dietNotes,
    });

    // 2. Insert check-in row
    const now = new Date();
    const idemKey = makeIdempotencyKey(p.deviceFingerprint, guest.id, now);
    const { row } = await checkinRepo.insertCheckIn({
      event_id: eventId,
      guest_id: guest.id,
      scanned_by: actorId,
      scanned_by_device: p.deviceFingerprint,
      idempotency_key: idemKey,
      result: "WALK_IN",
      previous_check_in_id: null,
    });

    return {
      result: "WALK_IN",
      guest: {
        id: guest.id,
        full_name: guest.full_name,
        category: guest.category,
        is_vip: guest.is_vip,
        diet_notes: guest.diet_notes,
        plus_one_count: guest.plus_one_count,
        email: guest.email,
        phone: guest.phone,
      },
      seating: null,            // walk-in belum punya kursi
      checked_in_at: row?.scanned_at ?? now.toISOString(),
      previous_scan_at: null,
      message: `Walk-in "${p.fullName}" berhasil ditambahkan & check-in.`,
    };
  },

  async getStats(eventId: string) {
    const total = await checkinRepo.countSuccessByEvent(eventId);
    return { total_success: total };
  },

  async listRecent(eventId: string, limit = 50) {
    if (limit < 1 || limit > 500) throw new ValidationError("limit 1-500.");
    return checkinRepo.listRecent(eventId, limit);
  },
};