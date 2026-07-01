// Event repository — akses Supabase via service-role (server-side).
// Frontend tidak boleh pakai service-role; hanya apps/api.
import { getSupabaseAdmin } from "../../config/supabase.js";
import type { EventRow, EventInsert, EventUpdate } from "./event.types.js";

export const eventRepo = {
  async list(filter: { orgId?: string; status?: string; includeArchived?: boolean }): Promise<EventRow[]> {
    const admin = getSupabaseAdmin();
    let q = admin
      .from("events")
      .select("*")
      .is("deleted_at", null)
      .order("starts_at", { ascending: false });
    if (filter.orgId) q = q.eq("org_id", filter.orgId);
    if (filter.status) q = q.eq("status", filter.status);
    if (!filter.includeArchived) q = q.neq("status", "ARCHIVED");
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as EventRow[];
  },

  async findById(id: string): Promise<EventRow | null> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("events")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return (data as EventRow) ?? null;
  },

  async create(input: EventInsert): Promise<EventRow> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("events")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data as EventRow;
  },

  async update(id: string, patch: EventUpdate, expectedVersion?: number): Promise<EventRow> {
    const admin = getSupabaseAdmin();
    let q = admin.from("events").update(patch).eq("id", id);
    if (expectedVersion !== undefined) q = q.eq("row_version", expectedVersion);
    const { data, error } = await q.select("*").single();
    if (error) throw error;
    return data as EventRow;
  },

  async archive(id: string): Promise<EventRow> {
    return this.update(id, { status: "ARCHIVED" });
  },

  async duplicate(id: string, newName: string, createdBy: string): Promise<EventRow> {
    const src = await this.findById(id);
    if (!src) throw new Error("Event not found");
    const { id: _id, row_version: _v, created_at: _c, updated_at: _u, deleted_at: _d, offline_manifest_blob_path: _m, ...rest } = src;
    return this.create({ ...rest, name: newName, status: "DRAFT", created_by: createdBy });
  },

  async softDelete(id: string): Promise<void> {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};