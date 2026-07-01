// Tipe FE reporting — mirror API.
export type Category = "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";

export interface AttendanceSummary {
  total_guests: number;
  total_checked_in: number;
  total_not_checked_in: number;
  total_walk_in: number;
  attendance_rate: number;
}

export interface CategoryBreakdown {
  category: Category;
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
  hour: string;
  count: number;
}

export interface VipAttendance {
  guest_id: string;
  guest_name: string;
  category: Category;
  checked_in_at: string | null;
  table_label: string | null;
}

export interface WalkInListItem {
  guest_id: string;
  guest_name: string;
  category: Category;
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

export interface DashboardData {
  summary: AttendanceSummary;
  categories: CategoryBreakdown[];
  tables: TableOccupancy[];
  hourly: HourlyDistribution[];
  vip: VipAttendance[];
  walkin: WalkInListItem[];
  activity: CheckInActivity[];
}