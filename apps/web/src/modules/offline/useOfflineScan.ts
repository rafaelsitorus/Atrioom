"use client";

// Smart scanner integration: kalau offline, write ke IndexedDB & enqueue.
// Kalau online, langsung call API (delegasi ke ScannerView via callback).
import { useCallback } from "react";
import { cacheRepo } from "./cache";
import { syncQueue, makeOpId } from "./sync";
import type { CachedGuest } from "./db";
import type { CheckInConfirmation } from "@/lib/types-checkin";

interface Params {
  eventId: string;
  deviceFingerprint: string;
}

export interface OfflineScanResult {
  result: "SUCCESS_LOCAL" | "QUEUED" | "NOT_FOUND";
  guest: CachedGuest | null;
  checked_in_at: string | null;
  message: string;
}

export function useOfflineScan({ eventId, deviceFingerprint }: Params) {
  return useCallback(async (qrToken: string): Promise<OfflineScanResult> => {
    const now = new Date();
    const nowIso = now.toISOString();
    const epochSec = Math.floor(now.getTime() / 1000);

    const guest = await cacheRepo.findGuestByQr(eventId, qrToken);
    if (!guest) {
      // Fallback ke API hanya kalau online (handle "QR valid di server tapi tidak di-cache")
      if (navigator.onLine) {
        try {
          const { api } = await import("@/lib/api-client");
          const r = await api.post(`/v1/events/${eventId}/checkin`, { qrToken, deviceFingerprint }) as CheckInConfirmation;
          return {
            result: "SUCCESS_LOCAL",
            guest: r.guest
              ? {
                  id: r.guest.id, event_id: eventId, full_name: r.guest.full_name,
                  email: r.guest.email, phone: r.guest.phone, category: r.guest.category,
                  is_vip: r.guest.is_vip, qr_token: qrToken, plus_one_count: r.guest.plus_one_count,
                  diet_notes: r.guest.diet_notes, checked_in_at: r.checked_in_at,
                  _downloaded_at: Date.now(), _source: "EVENT_DOWNLOAD",
                }
              : null,
            checked_in_at: r.checked_in_at,
            message: r.message,
          };
        } catch {
          return { result: "NOT_FOUND", guest: null, checked_in_at: null, message: "QR tidak valid." };
        }
      }
      return { result: "NOT_FOUND", guest: null, checked_in_at: null, message: "QR tidak ada di cache & sedang offline." };
    }

    // Guest ada di cache → cek apakah sudah checked-in
    if (guest.checked_in_at) {
      return {
        result: "SUCCESS_LOCAL",
        guest,
        checked_in_at: guest.checked_in_at,
        message: `${guest.full_name} sudah check-in sebelumnya.`,
      };
    }

    // Tandai di cache lokal
    await cacheRepo.updateGuestCheckedIn(guest.id, nowIso);

    // Enqueue untuk replay
    const opId = await makeOpId(deviceFingerprint, qrToken, epochSec);
    await syncQueue.enqueue({
      op_id: opId,
      op_type: "CHECK_IN",
      event_id: eventId,
      payload: { qrToken, deviceFingerprint, eventId },
    });

    return {
      result: navigator.onLine ? "SUCCESS_LOCAL" : "QUEUED",
      guest,
      checked_in_at: nowIso,
      message: navigator.onLine
        ? `${guest.full_name} — akan tersinkron otomatis.`
        : `${guest.full_name} — tersimpan lokal & akan terkirim saat online.`,
    };
  }, [eventId, deviceFingerprint]);
}