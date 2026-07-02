"use client";

// ScannerView — orchestrates QrScanner + CheckInModal + searchable guest select.
// EPIC04: pakai useOfflineScan untuk tahan network failure.
import { useState, useTransition, useEffect } from "react";
import { QrScanner } from "./QrScanner";
import { CheckInModal } from "./CheckInModal";
import { api, ApiError } from "@/lib/api-client";
import { ToastStack, type ToastItem } from "./ToastStack";
import { VipAlertChannel } from "./VipAlertChannel";
import { GuestSearchSelect, type GuestLite } from "./GuestSearchSelect";
import { useOfflineScan } from "@/modules/offline/useOfflineScan";
import { runSyncOnce } from "@/modules/offline/sync-orchestrator";
import type { CheckInConfirmation } from "@/lib/types-checkin";

interface Props {
  eventId: string;
  deviceFingerprint: string;
  guests: import("./GuestSearchSelect").GuestLite[];
  guestsError: string | null;
}

export function ScannerView({ eventId, deviceFingerprint, guests, guestsError }: Props) {
  const [paused, setPaused] = useState(false);
  const [confirmation, setConfirmation] = useState<CheckInConfirmation | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const offlineScan = useOfflineScan({ eventId, deviceFingerprint });

  // Boot sync orchestrator (import side-effects) + periodic re-sync
  useEffect(() => {
    void import("@/modules/offline/sync-orchestrator");
    const id = setInterval(() => { void runSyncOnce(); }, 30_000);
    return () => clearInterval(id);
  }, []);

  async function processScan(qrToken: string) {
    // Offline-first path — tulis ke cache + queue jika offline;
    // jika online, langsung ke API (fallback di dalam hook).
    const offline = await offlineScan(qrToken);

    if (offline.result === "SUCCESS_LOCAL" || offline.result === "QUEUED") {
      const synthetic: CheckInConfirmation = {
        result: "SUCCESS",
        guest: offline.guest
          ? {
              id: offline.guest.id, full_name: offline.guest.full_name,
              category: offline.guest.category, is_vip: offline.guest.is_vip,
              diet_notes: offline.guest.diet_notes, plus_one_count: offline.guest.plus_one_count,
              email: offline.guest.email, phone: offline.guest.phone,
            }
          : null,
        seating: null,
        checked_in_at: offline.checked_in_at,
        previous_scan_at: null,
        message: offline.message,
      };
      setConfirmation(synthetic);
      setPaused(true);
      pushToast(synthetic);
      // Trigger immediate sync kalau online
      if (navigator.onLine) void runSyncOnce();
      return;
    }

    // Fallback ke API langsung kalau offline scan memberi NOT_FOUND & online
    try {
      const r = await api.post(`/v1/events/${eventId}/checkin`, {
        qrToken,
        deviceFingerprint,
      }) as CheckInConfirmation;
      setConfirmation(r);
      setPaused(true);               // pause scanner while modal open
      // Small toast untuk ack regardless
      pushToast(r);
    } catch (e) {
      if (e instanceof ApiError) {
        pushToast({
          id: String(Date.now()),
          kind: "error",
          title: "Gagal",
          message: e.message,
          ts: Date.now(),
        } as ToastItem);
      }
    }
  }

  function pushToast(input: CheckInConfirmation | ToastItem) {
    if ("kind" in input) {
      // Already a toast item
      setToasts((cur) => [input, ...cur].slice(0, 5));
      return;
    }
    const r = input;
    const id = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 6);
    const t: ToastItem = r.result === "SUCCESS"
      ? { id, kind: "success", title: r.guest?.full_name ?? "Tamu", message: `Check-in berhasil · ${r.guest?.category ?? ""}`, ts: Date.now() }
      : r.result === "ALREADY_CHECKED_IN"
        ? { id, kind: "duplicate", title: r.guest?.full_name ?? "Tamu", message: `Sudah check-in sebelumnya`, ts: Date.now() }
        : r.result === "WALK_IN"
          ? { id, kind: "walkin", title: r.guest?.full_name ?? "Walk-in", message: `Berhasil · ${r.guest?.category ?? ""}`, ts: Date.now() }
          : { id, kind: "error", title: "Unknown", message: r.message, ts: Date.now() };
    setToasts((cur) => [t, ...cur].slice(0, 5));
  }

  function onCloseModal() {
    setConfirmation(null);
    setPaused(false);
  }

  function onPickGuest(guest: GuestLite) {
    // Trigger check-in pakai QR token dari guest yang dipilih dari dropdown
    void processScan(guest.qr_token);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Scanner column */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between rounded-3xl border border-cockpit-10 bg-black/40 px-5 py-3 backdrop-blur-md">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Scanner</p>
            <p className="mt-0.5 text-xs text-white/70">
              QR Token · Live decode
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Device</p>
            <p className="mt-0.5 font-body text-xs tabular-nums text-white/50">
              {deviceFingerprint.slice(0, 12)}…
            </p>
          </div>
        </div>

        {/* Scanner + manual search */}
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <QrScanner onResult={(r) => processScan(r.text)} paused={paused} />
          </div>

          {/* Manual search — searchable dropdown */}
          <div className="lg:col-span-2">
            <div className="heavy-frosted-glass flex h-full flex-col rounded-3xl p-6">
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Manual Check-In</p>
              <h3 className="mt-2 font-heading text-2xl text-white">Cari Tamu</h3>
              <p className="mt-2 text-xs text-white/40">
                Ketik nama, pilih dari daftar, atau tekan Enter untuk check-in.
              </p>

              <div className="mt-6">
                <GuestSearchSelect guests={guests} onPick={onPickGuest} loadError={guestsError} />
              </div>

              <div className="mt-auto pt-6 text-[10px] text-white/30">
                Pilih tamu dari daftar — QR token mereka dipakai otomatis.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live feed column */}
      <aside className="heavy-frosted-glass hidden w-80 shrink-0 flex-col rounded-3xl lg:flex">
        <header className="border-b border-cockpit-10 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Live Feed</p>
          <h3 className="font-heading text-2xl text-white">Recent Check-Ins</h3>
        </header>
        <div className="flex-1 overflow-y-auto">
          <VipAlertChannel
            eventId={eventId}
            onLocalToast={(t) => setToasts((cur) => [t, ...cur].slice(0, 5))}
          />
        </div>
      </aside>

      {/* Modal + toast stack */}
      <CheckInModal open={!!confirmation} data={confirmation} onClose={onCloseModal} />
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} />
    </div>
  );
}