// Tipe Check-In module.
import type { GuestCategory } from "../guest/guest.types";

export type CheckInResult = "SUCCESS" | "ALREADY_CHECKED_IN" | "NOT_FOUND" | "WALK_IN";

export interface CheckInRow {
  id: string;
  event_id: string;
  guest_id: string;
  scanned_at: string;
  scanned_by: string;
  scanned_by_device: string | null;
  idempotency_key: string;
  result: CheckInResult;
  previous_check_in_id: string | null;
  created_at: string;
}

// Output shape ke FE — sudah include detail guest + seat info dari JOIN
export interface CheckInConfirmation {
  result: CheckInResult;
  guest: {
    id: string;
    full_name: string;
    category: GuestCategory;
    is_vip: boolean;
    diet_notes: string | null;
    plus_one_count: number;
    email: string | null;
    phone: string | null;
  } | null;
  seating: {
    seat_label: string;
    table_label: string;
  } | null;
  checked_in_at: string | null;          // waktu scan yang BERHASIL (success atau pertama)
  previous_scan_at: string | null;       // waktu scan sebelumnya (untuk ALREADY_CHECKED_IN)
  message: string;                       // human-friendly line untuk modal
}