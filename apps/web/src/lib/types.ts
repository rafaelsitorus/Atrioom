// Tipe frontend untuk Event & Guest — mirror apps/api/src/modules/*/types.ts
// (akan dipindah ke packages/types di iterasi berikutnya).

export type EventStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "LIVE" | "CLOSED";

export interface EventRow {
  id: string;
  org_id: string;
  name: string;
  venue: string | null;
  capacity: number | null;
  starts_at: string;
  ends_at: string | null;
  status: EventStatus;
  created_by: string;
  offline_manifest_blob_path: string | null;
  created_at: string;
  updated_at: string;
  row_version: number;
  deleted_at: string | null;
}

export type GuestCategory = "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";
export type GuestSource = "MANUAL" | "IMPORT" | "WALK_IN";

export interface GuestRow {
  id: string;
  event_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  category: GuestCategory;
  is_vip: boolean;
  qr_token: string;
  plus_one_count: number;
  diet_notes: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  source: GuestSource;
  notes: string | null;
  created_at: string;
  updated_at: string;
  row_version: number;
  deleted_at: string | null;
}