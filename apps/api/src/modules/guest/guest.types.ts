// Tipe untuk Guest module.
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

export type GuestInsert = Pick<
  GuestRow,
  "event_id" | "full_name" | "category" | "source"
> &
  Partial<
    Pick<
      GuestRow,
      "email" | "phone" | "plus_one_count" | "diet_notes" | "notes"
    >
  >;

export type GuestUpdate = Partial<
  Pick<
    GuestRow,
    | "full_name"
    | "email"
    | "phone"
    | "category"
    | "plus_one_count"
    | "diet_notes"
    | "notes"
  >
>;