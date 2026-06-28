// Tipe Seating — mirror di packages/types nanti.
export type TableShape = "ROUND" | "RECTANGULAR" | "LONG";
export type SeatingAction = "ASSIGN" | "UNASSIGN" | "MOVE";

export interface TableRow {
  id: string;
  event_id: string;
  label: string;
  capacity: number;
  pos_x: number;
  pos_y: number;
  shape: TableShape;
  notes: string | null;
  created_at: string;
  updated_at: string;
  row_version: number;
  deleted_at: string | null;
}

export interface SeatRow {
  id: string;
  table_id: string;
  seat_label: string;
  pos_x: number;
  pos_y: number;
  created_at: string;
  updated_at: string;
  row_version: number;
  deleted_at: string | null;
}

export interface SeatAssignmentRow {
  id: string;
  event_id: string;
  seat_id: string;
  guest_id: string;
  assigned_by: string | null;
  assigned_at: string;
  row_version: number;
  deleted_at: string | null;
}

export interface SeatingAuditRow {
  id: number;
  event_id: string;
  actor_user_id: string;
  action: SeatingAction;
  guest_id: string | null;
  from_seat_id: string | null;
  to_seat_id: string | null;
  from_table_id: string | null;
  to_table_id: string | null;
  metadata: unknown;
  created_at: string;
  undone_at: string | null;
  undone_by: string | null;
}