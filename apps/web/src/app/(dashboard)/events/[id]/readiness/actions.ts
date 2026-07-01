"use server";

// Server action: download event manifest & persist ke IndexedDB.
// IndexedDB adalah client-side; jadi server action hanya return data,
// client component yang nge-write ke Dexie.
import { serverApi } from "@/lib/server-api";

export async function fetchManifestAction(eventId: string) {
  return serverApi.get(`/v1/events/${eventId}/manifest`);
}