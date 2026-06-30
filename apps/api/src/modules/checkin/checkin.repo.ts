// Check-In repo — service-role, optimized untuk <50ms hot path.
import { createHash, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "../../config/supabase";
import type { GuestCategory } from "../guest/guest.types";
import type { CheckInRow, CheckInResult } from "./checkin.types";

export interface CheckInInsertInput {
  event_id: string;
  guest_id: string;
  scanned_by: string;
  scanned_by_device: string | null;
  idempotency_key: string;
  result: CheckInResult;
  previous_check_in_id: string | null;
}

/** SHA256 dari (deviceFingerprint + guestId + epochSeconds) → idempotency_key. */
export function makeIdempotencyKey(
  deviceFingerprint: string,
  guestId: string,
  scannedAt: Date,
): string {
  const epochSec = Math.floor(scannedAt.getTime() / 1000);
  return createHash("sha256")
    .update(`${deviceFingerprint}|${guestId}|${epochSec}`)
    .digest("hex");
}

export const checkinRepo = {
  /**
   * Hot path: lookup guest by qr_token. Returns null jika invalid.
   * Pakai indexed column (qr_token punya UNIQUE index).
   */
  async findGuestByQrToken(eventId: string, qrToken: string): Promise<{
    id: string;
    full_name: string;
    category: GuestCategory;
    is_vip: boolean;
    diet_notes: string | null;
    plus_one_count: number;
    email: string | null;
    phone: string | null;
  } | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("guests")
      .select("id, full_name, category, is_vip, diet_notes, plus_one_count, email, phone")
      .eq("event_id", eventId)
      .eq("qr_token", qrToken)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Cek apakah guest SUDAH pernah check-in (SUCCESS) sebelumnya di event ini.
   * Pakai partial index WHERE result='SUCCESS' untuk O(1) lookup.
   */
  async findExistingSuccessCheckIn(guestId: string, eventId: string): Promise<CheckInRow | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("check_ins")
      .select("*")
      .eq("event_id", eventId)
      .eq("guest_id", guestId)
      .eq("result", "SUCCESS")
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as CheckInRow) ?? null;
  },

  /**
   * Insert check-in row. UNIQUE idempotency_key menjamin dedup otomatis
   * untuk double-scan dari device yang sama dalam detik yang sama.
   * Returns { row, duplicate } — duplicate=true jika key sudah ada.
   */
  async insertCheckIn(input: CheckInInsertInput): Promise<{ row: CheckInRow | null; duplicate: boolean }> {
    const admin = getSupabaseAdmin();
    const row = {
      id: randomUUID(),
      event_id: input.event_id,
      guest_id: input.guest_id,
      scanned_by: input.scanned_by,
      scanned_by_device: input.scanned_by_device,
      idempotency_key: input.idempotency_key,
      result: input.result,
      previous_check_in_id: input.previous_check_in_id,
    };
    const { data, error } = await admin.from("check_ins").insert(row).select("*").maybeSingle();
    if (error) {
      // Duplicate idempotency_key — return null + duplicate flag
      if (error.code === "23505") return { row: null, duplicate: true };
      throw error;
    }
    return { row: data as CheckInRow, duplicate: false };
  },

  /**
   * Lookup seating info untuk guest (aktif).
   */
  async findSeatingForGuest(guestId: string): Promise<{ seat_label: string; table_label: string } | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("seat_assignments")
      .select("seats!inner(seat_label, tables!inner(label))")
      .eq("guest_id", guestId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      // Seat mungkin belum ter-assign — return null (bukan throw)
      if (error.code === "PGRST116") return null;
      throw error;
    }
    const r = data as { seats: { seat_label: string; tables: { label: string } } } | null;
    if (!r) return null;
    return { seat_label: r.seats.seat_label, table_label: r.seats.tables.label };
  },

  /**
   * Count check-in SUCCESS per event — untuk dashboard stat.
   */
  async countSuccessByEvent(eventId: string): Promise<number> {
    const admin = getSupabaseAdmin();
    const { count, error } = await admin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("result", "SUCCESS");
    if (error) throw error;
    return count ?? 0;
  },

  /**
   * List recent check-ins untuk dashboard.
   */
  async listRecent(eventId: string, limit = 50): Promise<unknown[]> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("check_in_audit")
      .select("id, guest_id, guest_name, guest_category, is_vip, scanned_at, seat_label, table_label, diet_notes")
      .eq("event_id", eventId)
      .order("scanned_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
};