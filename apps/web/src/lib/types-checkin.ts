// Tipe FE untuk check-in — mirror apps/api/src/modules/checkin/checkin.types.ts
export type CheckInResult = "SUCCESS" | "ALREADY_CHECKED_IN" | "NOT_FOUND" | "WALK_IN";

export interface CheckInConfirmation {
  result: CheckInResult;
  guest: {
    id: string;
    full_name: string;
    category: "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";
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
  checked_in_at: string | null;
  previous_scan_at: string | null;
  message: string;
}

// Realtime payload dari check_in_audit
export interface CheckInAuditRow {
  id: number;
  check_in_id: string;
  event_id: string;
  guest_id: string;
  guest_category: "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";
  is_vip: boolean;
  guest_name: string;
  scanned_at: string;
  seat_label: string | null;
  table_label: string | null;
  diet_notes: string | null;
  notification_sent: boolean;
}