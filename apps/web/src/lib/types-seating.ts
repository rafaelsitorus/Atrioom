// Tipe frontend Seating — mirror apps/api/src/modules/seating/seating.types.ts
export type TableShape = "ROUND" | "RECTANGULAR" | "LONG";

export interface TableRow {
  id: string;
  event_id: string;
  label: string;
  capacity: number;
  pos_x: number;
  pos_y: number;
  shape: TableShape;
  notes: string | null;
  row_version: number;
  updated_at: string;
}

export interface SeatRow {
  id: string;
  table_id: string;
  seat_label: string;
  pos_x: number;
  pos_y: number;
  row_version: number;
}

export interface AssignmentWithDetails {
  id: string;
  event_id: string;
  seat_id: string;
  guest_id: string;
  guest_name: string;
  guest_category: "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";
  is_vip: boolean;
  seat_label: string;
  table_label: string;
  assigned_at: string;
}

export interface GuestLite {
  id: string;
  full_name: string;
  category: "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";
  is_vip: boolean;
  email: string | null;
  phone: string | null;
  plus_one_count: number;
}