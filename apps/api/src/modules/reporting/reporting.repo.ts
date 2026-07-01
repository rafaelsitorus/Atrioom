// Reporting repo — Supabase queries (service-role).
// Semua query pakai filter event_id + tidak lewat RLS (server-side).
import { getSupabaseAdmin } from "../../config/supabase";
import type {
  AttendanceSummary,
  CategoryBreakdown,
  TableOccupancy,
  HourlyDistribution,
  VipAttendance,
  WalkInListItem,
  CheckInActivity,
} from "./reporting.types";

export const reportingRepo = {
  /** Aggregated attendance stats — 1 round-trip. */
  async getAttendanceSummary(eventId: string): Promise<AttendanceSummary> {
    const admin = getSupabaseAdmin();
    // Pakai RPC atau hitung dari 1 query + 1 count
    const [guestsRes, checkinsRes] = await Promise.all([
      admin
        .from("guests")
        .select("id, category, is_vip, checked_in_at, source", { count: "exact" })
        .eq("event_id", eventId)
        .is("deleted_at", null),
      admin
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("result", "SUCCESS"),
    ]);

    const totalGuests = guestsRes.count ?? 0;
    const guests = (guestsRes.data ?? []) as Array<{ checked_in_at: string | null; source: string }>;
    const totalCheckedIn = guests.filter((g) => g.checked_in_at !== null).length;
    const totalWalkIn = guests.filter((g) => g.source === "WALK_IN").length;

    return {
      total_guests: totalGuests,
      total_checked_in: totalCheckedIn,
      total_not_checked_in: totalGuests - totalCheckedIn,
      total_walk_in: totalWalkIn,
      attendance_rate: totalGuests > 0 ? totalCheckedIn / totalGuests : 0,
    };
  },

  async getCategoryBreakdown(eventId: string): Promise<CategoryBreakdown[]> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("guests")
      .select("category, checked_in_at")
      .eq("event_id", eventId)
      .is("deleted_at", null);
    if (error) throw error;
    const map = new Map<string, { total: number; checked_in: number }>();
    for (const row of (data ?? []) as Array<{ category: string; checked_in_at: string | null }>) {
      const cur = map.get(row.category) ?? { total: 0, checked_in: 0 };
      cur.total += 1;
      if (row.checked_in_at) cur.checked_in += 1;
      map.set(row.category, cur);
    }
    return Array.from(map.entries()).map(([category, v]) => ({
      category: category as CategoryBreakdown["category"],
      total: v.total,
      checked_in: v.checked_in,
    }));
  },

  async getTableOccupancy(eventId: string): Promise<TableOccupancy[]> {
    const admin = getSupabaseAdmin();
    // Tables + assignment counts + check-in counts via single PostgREST embed
    const { data, error } = await admin
      .from("tables")
      .select(`
        id, label, capacity,
        seats!inner(id, seat_assignments(id, deleted_at, guests(checked_in_at)))
      `)
      .eq("event_id", eventId)
      .is("deleted_at", null);
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => {
      const seats = (row.seats ?? []) as Array<{
        id: string;
        seat_assignments: Array<{ id: string; deleted_at: string | null; guests: { checked_in_at: string | null } | null }>;
      }>;
      const assigned = seats.filter((s) => s.seat_assignments.some((a) => !a.deleted_at)).length;
      const checkedIn = seats.filter((s) =>
        s.seat_assignments.some((a) => !a.deleted_at && a.guests?.checked_in_at !== null),
      ).length;
      return {
        table_id: row.id as string,
        table_label: row.label as string,
        capacity: row.capacity as number,
        assigned,
        checked_in: checkedIn,
      };
    });
  },

  async getHourlyDistribution(eventId: string): Promise<HourlyDistribution[]> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("check_ins")
      .select("scanned_at")
      .eq("event_id", eventId)
      .eq("result", "SUCCESS");
    if (error) throw error;
    const buckets = new Map<string, number>();
    for (const row of (data ?? []) as Array<{ scanned_at: string }>) {
      const d = new Date(row.scanned_at);
      const hour = `${String(d.getHours()).padStart(2, "0")}:00`;
      buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  },

  async getVipAttendance(eventId: string): Promise<VipAttendance[]> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("guests")
      .select(`
        id, full_name, category, checked_in_at,
        seat_assignments!inner(deleted_at, seats!inner(seat_label, tables!inner(label)))
      `)
      .eq("event_id", eventId)
      .eq("is_vip", true)
      .is("deleted_at", null);
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => {
      const sa = ((row.seat_assignments ?? []) as Array<{ deleted_at: string | null; seats: { seat_label: string; tables: { label: string } } }>).find((a) => !a.deleted_at);
      return {
        guest_id: row.id as string,
        guest_name: row.full_name as string,
        category: row.category as VipAttendance["category"],
        checked_in_at: (row.checked_in_at as string | null) ?? null,
        table_label: sa ? `${sa.seats.tables.label} · ${sa.seats.seat_label}` : null,
      };
    });
  },

  async getWalkInList(eventId: string): Promise<WalkInListItem[]> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("guests")
      .select("id, full_name, category, created_at, checked_in_at")
      .eq("event_id", eventId)
      .eq("source", "WALK_IN")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      guest_id: row.id as string,
      guest_name: row.full_name as string,
      category: row.category as WalkInListItem["category"],
      registered_at: row.created_at as string,
      checked_in_at: (row.checked_in_at as string | null) ?? null,
    }));
  },

  async getCheckInActivity(eventId: string, limit = 200): Promise<CheckInActivity[]> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("check_in_audit")
      .select("id, guest_id, guest_name, scanned_at, result")
      .eq("event_id", eventId)
      .order("scanned_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      guest_id: row.guest_id as string,
      guest_name: row.guest_name as string,
      result: (row.result as string) ?? "SUCCESS",
      scanned_at: row.scanned_at as string,
      scanned_by: "",
    }));
  },
};