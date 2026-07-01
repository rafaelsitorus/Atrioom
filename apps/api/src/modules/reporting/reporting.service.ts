// Reporting service — orchestrate stats + build Excel workbooks.
import ExcelJS from "exceljs";
import { z } from "zod";
import { reportingRepo } from "./reporting.repo.js";
import type { EventSummary } from "./reporting.types.js";

const idSchema = z.string().uuid();

export const reportingService = {
  async getDashboard(eventId: string) {
    const id = idSchema.parse(eventId);
    const [summary, categories, tables, hourly, vip, walkin, activity] = await Promise.all([
      reportingRepo.getAttendanceSummary(id),
      reportingRepo.getCategoryBreakdown(id),
      reportingRepo.getTableOccupancy(id),
      reportingRepo.getHourlyDistribution(id),
      reportingRepo.getVipAttendance(id),
      reportingRepo.getWalkInList(id),
      reportingRepo.getCheckInActivity(id, 50),
    ]);
    return { summary, categories, tables, hourly, vip, walkin, activity };
  },

  async getEventSummary(eventId: string): Promise<EventSummary> {
    const id = idSchema.parse(eventId);
    const { getSupabaseAdmin } = await import("../../config/supabase");
    const admin = getSupabaseAdmin();
    const { data: ev } = await admin
      .from("events")
      .select("name, venue, starts_at")
      .eq("id", id)
      .maybeSingle();
    const base = await reportingRepo.getAttendanceSummary(id);
    return {
      ...base,
      event_name: ev?.name ?? "",
      venue: ev?.venue ?? null,
      starts_at: ev?.starts_at ?? new Date().toISOString(),
    };
  },

  /**
   * Generate Excel workbook berisi:
   * - Sheet 1: Summary (event metadata + KPI)
   * - Sheet 2: All Guests (lengkap dengan status check-in)
   * - Sheet 3: Walk-In List
   * - Sheet 4: VIP Attendance
   * - Sheet 5: Check-In Activity
   */
  async exportAttendanceExcel(eventId: string): Promise<Buffer> {
    const id = idSchema.parse(eventId);
    const { getSupabaseAdmin } = await import("../../config/supabase");
    const admin = getSupabaseAdmin();

    const [event, summary, walkin, vip, activity] = await Promise.all([
      admin.from("events").select("name, venue, starts_at, ends_at, capacity").eq("id", id).maybeSingle(),
      reportingRepo.getAttendanceSummary(id),
      reportingRepo.getWalkInList(id),
      reportingRepo.getVipAttendance(id),
      reportingRepo.getCheckInActivity(id, 1000),
    ]);

    const { data: guests } = await admin
      .from("guests")
      .select(`
        id, full_name, email, phone, category, is_vip, plus_one_count, diet_notes,
        source, checked_in_at, created_at
      `)
      .eq("event_id", id)
      .is("deleted_at", null)
      .order("full_name");

    const wb = new ExcelJS.Workbook();
    wb.creator = "Atrioom";
    wb.created = new Date();

    // ── Sheet 1: Summary ────────────────────────────────────────────────────
    const ws1 = wb.addWorksheet("Summary");
    ws1.columns = [
      { header: "Field", key: "field", width: 30 },
      { header: "Value", key: "value", width: 40 },
    ];
    ws1.addRow({ field: "Event Name", value: event.data?.name ?? "" });
    ws1.addRow({ field: "Venue", value: event.data?.venue ?? "" });
    ws1.addRow({ field: "Starts At", value: event.data?.starts_at ?? "" });
    ws1.addRow({ field: "Ends At", value: event.data?.ends_at ?? "" });
    ws1.addRow({ field: "Capacity", value: event.data?.capacity ?? "" });
    ws1.addRow({ field: "Total Guests", value: summary.total_guests });
    ws1.addRow({ field: "Checked In", value: summary.total_checked_in });
    ws1.addRow({ field: "Not Checked In", value: summary.total_not_checked_in });
    ws1.addRow({ field: "Walk-In", value: summary.total_walk_in });
    ws1.addRow({ field: "Attendance Rate", value: `${(summary.attendance_rate * 100).toFixed(1)}%` });
    ws1.getRow(1).font = { bold: true };

    // ── Sheet 2: All Guests ─────────────────────────────────────────────────
    const ws2 = wb.addWorksheet("All Guests");
    ws2.columns = [
      { header: "Full Name", key: "full_name", width: 30 },
      { header: "Category", key: "category", width: 12 },
      { header: "VIP", key: "is_vip", width: 6 },
      { header: "Source", key: "source", width: 10 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Plus-One", key: "plus_one_count", width: 10 },
      { header: "Diet Notes", key: "diet_notes", width: 30 },
      { header: "Checked In At", key: "checked_in_at", width: 22 },
      { header: "Registered At", key: "created_at", width: 22 },
    ];
    for (const g of (guests ?? []) as Array<Record<string, unknown>>) {
      ws2.addRow({
        full_name: g.full_name,
        category: g.category,
        is_vip: g.is_vip ? "Yes" : "No",
        source: g.source,
        email: g.email ?? "",
        phone: g.phone ?? "",
        plus_one_count: g.plus_one_count ?? 0,
        diet_notes: g.diet_notes ?? "",
        checked_in_at: g.checked_in_at ?? "",
        created_at: g.created_at,
      });
    }
    ws2.getRow(1).font = { bold: true };
    ws2.views = [{ state: "frozen", ySplit: 1 }];

    // ── Sheet 3: Walk-Ins ───────────────────────────────────────────────────
    const ws3 = wb.addWorksheet("Walk-In");
    ws3.columns = [
      { header: "Name", key: "guest_name", width: 30 },
      { header: "Category", key: "category", width: 12 },
      { header: "Registered At", key: "registered_at", width: 22 },
      { header: "Checked In At", key: "checked_in_at", width: 22 },
    ];
    for (const w of walkin) ws3.addRow(w);
    ws3.getRow(1).font = { bold: true };

    // ── Sheet 4: VIP ────────────────────────────────────────────────────────
    const ws4 = wb.addWorksheet("VIP Attendance");
    ws4.columns = [
      { header: "Name", key: "guest_name", width: 30 },
      { header: "Category", key: "category", width: 12 },
      { header: "Checked In At", key: "checked_in_at", width: 22 },
      { header: "Table", key: "table_label", width: 22 },
    ];
    for (const v of vip) ws4.addRow(v);
    ws4.getRow(1).font = { bold: true };

    // ── Sheet 5: Activity ───────────────────────────────────────────────────
    const ws5 = wb.addWorksheet("Check-In Activity");
    ws5.columns = [
      { header: "Time", key: "scanned_at", width: 22 },
      { header: "Guest", key: "guest_name", width: 30 },
      { header: "Result", key: "result", width: 20 },
    ];
    for (const a of activity) ws5.addRow(a);
    ws5.getRow(1).font = { bold: true };

    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer | Buffer;
    return Buffer.from(buf as ArrayBuffer);
  },
};