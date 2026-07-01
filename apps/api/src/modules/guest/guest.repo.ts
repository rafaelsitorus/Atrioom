// Guest repository — pakai service-role.
import { getSupabaseAdmin } from "../../config/supabase.js";
import type { GuestRow, GuestInsert, GuestUpdate } from "./guest.types.js";

const SELECT_COLS = "id,event_id,full_name,email,phone,category,is_vip,qr_token,plus_one_count,diet_notes,checked_in_at,checked_in_by,source,notes,created_at,updated_at,row_version,deleted_at";

export const guestRepo = {
  async listByEvent(
    eventId: string,
    opts: { category?: string; search?: string; limit?: number; offset?: number } = {},
  ): Promise<{ rows: GuestRow[]; total: number }> {
    const admin = getSupabaseAdmin();
    let q = admin
      .from("guests")
      .select(SELECT_COLS, { count: "exact" })
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .order("row_version", { ascending: false });
    if (opts.category) q = q.eq("category", opts.category);
    if (opts.search) q = q.ilike("full_name", `%${opts.search}%`);
    if (opts.limit !== undefined) q = q.limit(opts.limit);
    if (opts.offset !== undefined) q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return { rows: (data ?? []) as GuestRow[], total: count ?? 0 };
  },

  async findById(id: string): Promise<GuestRow | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("guests")
      .select(SELECT_COLS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return (data as GuestRow) ?? null;
  },

  async findByQrToken(qrToken: string): Promise<GuestRow | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("guests")
      .select(SELECT_COLS)
      .eq("qr_token", qrToken)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return (data as GuestRow) ?? null;
  },

  async create(input: GuestInsert): Promise<GuestRow> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("guests").insert(input).select(SELECT_COLS).single();
    if (error) throw error;
    return data as GuestRow;
  },

  async createBatch(inputs: GuestInsert[]): Promise<GuestRow[]> {
    if (inputs.length === 0) return [];
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("guests").insert(inputs).select(SELECT_COLS);
    if (error) throw error;
    return (data ?? []) as GuestRow[];
  },

  async update(id: string, patch: GuestUpdate, expectedVersion?: number): Promise<GuestRow> {
    const admin = getSupabaseAdmin();
    let q = admin.from("guests").update(patch).eq("id", id);
    if (expectedVersion !== undefined) q = q.eq("row_version", expectedVersion);
    const { data, error } = await q.select(SELECT_COLS).single();
    if (error) throw error;
    return data as GuestRow;
  },

  async softDelete(id: string): Promise<void> {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("guests")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};