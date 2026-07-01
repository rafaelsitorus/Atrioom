"use server";

// Server action: download event manifest & persist ke IndexedDB.
// IndexedDB adalah client-side; jadi server action hanya return data,
// client component yang nge-write ke Dexie.
import { api } from "@/lib/api-client";

export async function fetchManifestAction(eventId: string) {
  return api.get(`/v1/events/${eventId}/manifest`);
}