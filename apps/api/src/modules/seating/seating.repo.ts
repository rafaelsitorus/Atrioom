// Seating repository — service-role ke Supabase.
import { getSupabaseAdmin } from "../../config/supabase";
import type { TableRow, SeatRow, SeatAssignmentRow, SeatingAuditRow } from "./seating.types";

export const seatingRepo = {
  // ── Tables ───────────────────────────────────────────────────────────────
  async listTables(eventId: string): Promise<TableRow[]> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("tables")
      .select("*")
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .order("label");
    if (error) throw error;
    return (data ?? []) as TableRow[];
  },

  async createTable(input: Omit<TableRow, "id" | "created_at" | "updated_at" | "row_version" | "deleted_at">): Promise<TableRow> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("tables").insert(input).select("*").single();
    if (error) throw error;
    return data as TableRow;
  },

  async updateTable(id: string, patch: Partial<TableRow>): Promise<TableRow> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("tables").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as TableRow;
  },

  async deleteTable(id: string): Promise<void> {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("tables")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  // ── Seats ────────────────────────────────────────────────────────────────
  async listSeatsByEvent(eventId: string): Promise<SeatRow[]> {
    const admin = getSupabaseAdmin();
    // Join lewat tables.event_id
    const { data, error } = await admin
      .from("seats")
      .select("*, tables!inner(event_id)")
      .eq("tables.event_id", eventId)
      .is("deleted_at", null);
    if (error) throw error;
    // Flatten: tables hanya punya event_id, kita drop
    return (data ?? []).map((r: SeatRow & { tables: unknown }) => {
      const { tables: _t, ...seat } = r;
      return seat as SeatRow;
    });
  },

  async createSeatsBulk(seats: Omit<SeatRow, "id" | "created_at" | "updated_at" | "row_version" | "deleted_at">[]): Promise<SeatRow[]> {
    if (seats.length === 0) return [];
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("seats").insert(seats).select("*");
    if (error) throw error;
    return (data ?? []) as SeatRow[];
  },

  async findSeatById(id: string): Promise<SeatRow | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("seats").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as SeatRow) ?? null;
  },

  async findTableBySeat(seatId: string): Promise<TableRow | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("seats")
      .select("*, tables(*)")
      .eq("id", seatId)
      .maybeSingle();
    if (error) throw error;
    const r = data as (SeatRow & { tables: TableRow | null }) | null;
    return r?.tables ?? null;
  },

  // ── Assignments ──────────────────────────────────────────────────────────
  async listActiveAssignments(eventId: string): Promise<Array<SeatAssignmentRow & { guest_name: string; guest_category: string; is_vip: boolean; seat_label: string; table_label: string }>> {
    const admin = getSupabaseAdmin();
    // PostgREST embed: assignments → seats → tables, assignments → guests
    const { data, error } = await admin
      .from("seat_assignments")
      .select(`
        id, event_id, seat_id, guest_id, assigned_by, assigned_at, row_version, deleted_at,
        seats!inner(seat_label, tables!inner(label)),
        guests!inner(full_name, category, is_vip)
      `)
      .eq("event_id", eventId)
      .is("deleted_at", null);
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => {
      const seats = r.seats as { seat_label: string; tables: { label: string } };
      const guests = r.guests as { full_name: string; category: string; is_vip: boolean };
      return {
        ...(r as unknown as SeatAssignmentRow),
        guest_name: guests.full_name,
        guest_category: guests.category,
        is_vip: guests.is_vip,
        seat_label: seats.seat_label,
        table_label: seats.tables.label,
      };
    });
  },

  async findActiveAssignmentBySeat(seatId: string): Promise<SeatAssignmentRow | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("seat_assignments")
      .select("*")
      .eq("seat_id", seatId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return (data as SeatAssignmentRow) ?? null;
  },

  async findActiveAssignmentByGuest(guestId: string): Promise<SeatAssignmentRow | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("seat_assignments")
      .select("*")
      .eq("guest_id", guestId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return (data as SeatAssignmentRow) ?? null;
  },

  async insertAssignment(input: Omit<SeatAssignmentRow, "id" | "assigned_at" | "row_version" | "deleted_at">): Promise<SeatAssignmentRow> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("seat_assignments")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data as SeatAssignmentRow;
  },

  async softDeleteAssignment(id: string): Promise<void> {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("seat_assignments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  // ── Audit ────────────────────────────────────────────────────────────────
  async insertAudit(input: Omit<SeatingAuditRow, "id" | "created_at" | "undone_at" | "undone_by">): Promise<SeatingAuditRow> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("seating_audit")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data as SeatingAuditRow;
  },

  async findLatestUndoneAudit(eventId: string): Promise<SeatingAuditRow | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("seating_audit")
      .select("*")
      .eq("event_id", eventId)
      .is("undone_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as SeatingAuditRow) ?? null;
  },

  async markAuditUndone(id: number, undoneBy: string): Promise<void> {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("seating_audit")
      .update({ undone_at: new Date().toISOString(), undone_by: undoneBy })
      .eq("id", id);
    if (error) throw error;
  },
};