// Tipe untuk Event module.
// NOTE: Tipe ini akan di-share ke FE via packages/types di iterasi berikutnya.
// Untuk EPIC01 kita duplikasi lokal di api & FE agar iterasi cepat.
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

export type EventInsert = Pick<
  EventRow,
  "org_id" | "name" | "venue" | "capacity" | "starts_at" | "ends_at" | "created_by"
> & {
  status?: EventStatus;
};

export type EventUpdate = Partial<
  Pick<EventRow, "name" | "venue" | "capacity" | "starts_at" | "ends_at" | "status">
>;