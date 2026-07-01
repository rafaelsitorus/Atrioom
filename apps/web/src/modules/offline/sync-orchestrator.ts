"use client";

// Sync orchestrator — replay queue saat online.
// Subscribe ke 'online' event dan trigger manual by 'atrioom:trigger-sync'.
import { syncQueue } from "./sync";
import { api } from "@/lib/api-client";

let syncing = false;

export async function runSyncOnce(): Promise<{ applied: number; rejected: number }> {
  if (syncing) return { applied: 0, rejected: 0 };
  if (!navigator.onLine) return { applied: 0, rejected: 0 };
  syncing = true;
  window.dispatchEvent(new CustomEvent("atrioom:sync-start"));

  let applied = 0;
  let rejected = 0;

  try {
    const items = await syncQueue.listPending(100);
    for (const item of items) {
      if (!item.id) continue;
      try {
        await syncQueue.markInFlight(item.id);
        await dispatchOp(item.op_type, item.payload, item.op_id);
        await syncQueue.markApplied(item.id);
        applied++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        await syncQueue.markRejected(item.id, msg);
        rejected++;
      }
    }
  } finally {
    syncing = false;
    window.dispatchEvent(new CustomEvent("atrioom:sync-end"));
  }
  return { applied, rejected };
}

async function dispatchOp(
  opType: "CHECK_IN" | "ASSIGN" | "UNASSIGN" | "WALK_IN",
  payload: Record<string, unknown>,
  opId: string,
): Promise<void> {
  const eventId = String(payload.eventId ?? "");
  switch (opType) {
    case "CHECK_IN":
      await api.post(`/v1/events/${eventId}/checkin`, {
        qrToken: payload.qrToken,
        deviceFingerprint: payload.deviceFingerprint,
      });
      return;
    case "WALK_IN":
      await api.post(`/v1/events/${eventId}/walkin`, payload);
      return;
    case "ASSIGN":
      await api.post(`/v1/events/${eventId}/assignments`, payload);
      return;
    case "UNASSIGN":
      await api.delete(`/v1/events/${eventId}/seats/${payload.seatId}/assignment`);
      return;
    default:
      throw new Error(`Unknown op_type: ${opType satisfies never}`);
  }
}

// Subscribe ke event & auto-replay
if (typeof window !== "undefined") {
  const onOnline = () => { void runSyncOnce(); };
  const onTrigger = () => { void runSyncOnce(); };
  window.addEventListener("online", onOnline);
  window.addEventListener("atrioom:trigger-sync", onTrigger as EventListener);

  // First sync on load (online-only)
  if (navigator.onLine) {
    setTimeout(() => { void runSyncOnce(); }, 2000);
  }
}