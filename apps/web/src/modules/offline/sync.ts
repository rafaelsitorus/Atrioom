// Sync queue helpers — tahan offline check-in ke IndexedDB, replay ke server saat online.
"use client";

import { getDb, type SyncQueueOp } from "./db";

// Fallback hash sederhana (32-bit FNV-like) — cukup untuk op_id,
// karena server side sudah pakai SHA256 terhadap nilai deviceId+guestId+epochSec.
// Browser akan pakai SubtleCrypto bila tersedia.
function fallbackHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, "0") +
         Math.abs(h ^ Math.floor(Date.now() / 60000)).toString(16).padStart(8, "0");
}

// Asinkron: pakai SubtleCrypto (SHA-256 native browser)
export async function makeOpId(deviceId: string, qrToken: string, epochSec: number): Promise<string> {
  const text = `${deviceId}|${qrToken}|${epochSec}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const buf = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // fallback to simple hash
      return fallbackHash(text);
    }
  }
  return fallbackHash(text);
}

export const syncQueue = {
  async enqueue(op: Omit<SyncQueueOp, "id" | "created_at" | "attempts" | "last_error" | "status">) {
    const db = getDb();
    await db.syncQueue.add({
      ...op,
      created_at: Date.now(),
      attempts: 0,
      last_error: null,
      status: "PENDING",
    });
  },

  async listPending(limit = 50) {
    const db = getDb();
    return db.syncQueue
      .where({ status: "PENDING" })
      .limit(limit)
      .toArray();
  },

  async markInFlight(id: number) {
    const db = getDb();
    await db.syncQueue.update(id, { status: "IN_FLIGHT" });
  },

  async markApplied(id: number) {
    const db = getDb();
    await db.syncQueue.update(id, { status: "APPLIED", last_error: null });
  },

  async markRejected(id: number, error: string) {
    const db = getDb();
    await db.syncQueue.update(id, {
      status: "REJECTED",
      last_error: error,
      attempts: (await db.syncQueue.get(id))?.attempts ?? 0 + 1,
    });
  },

  async countPending(): Promise<number> {
    const db = getDb();
    return db.syncQueue.where({ status: "PENDING" }).count();
  },

  async lastSyncAt(): Promise<number | null> {
    const db = getDb();
    const all = await db.syncQueue.where("status").equals("APPLIED").toArray();
    if (all.length === 0) return null;
    const latest = all.reduce((acc, r) => (r.created_at > acc ? r.created_at : acc), 0);
    return latest;
  },

  async delete(id: number) {
    const db = getDb();
    await db.syncQueue.delete(id);
  },

  async clearApplied() {
    const db = getDb();
    await db.syncQueue.where("status").equals("APPLIED").delete();
  },
};