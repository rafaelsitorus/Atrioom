// Tipe Reporting — output shapes untuk dashboard & exports.
import type { GuestCategory } from "../guest/guest.types.js";

export interface AttendanceSummary {
  total_guests: number;
  total_checked_in: number;
  total_not_checked_in: number;
  total_walk_in: number;
  attendance_rate: number;             // 0..1
}

export interface CategoryBreakdown {
  category: GuestCategory;
  total: number;
  checked_in: number;
}

export interface TableOccupancy {
  table_id: string;
  table_label: string;
  capacity: number;
  assigned: number;
  checked_in: number;
}

export interface HourlyDistribution {
  hour: string;                         // "18:00"
  count: number;
}

export interface VipAttendance {
  guest_id: string;
  guest_name: string;
  category: GuestCategory;
  checked_in_at: string | null;
  table_label: string | null;
}

export interface WalkInListItem {
  guest_id: string;
  guest_name: string;
  category: GuestCategory;
  registered_at: string;
  checked_in_at: string | null;
}

export interface CheckInActivity {
  id: number;
  guest_id: string;
  guest_name: string;
  result: string;
  scanned_at: string;
  scanned_by: string;
}

export interface EventSummary extends AttendanceSummary {
  event_name: string;
  venue: string | null;
  starts_at: string;
}