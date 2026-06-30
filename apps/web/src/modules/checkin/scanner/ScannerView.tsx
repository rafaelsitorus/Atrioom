"use client";

// ScannerView — orchestrates QrScanner + CheckInModal + manual search.
import { useState, useTransition } from "react";
import { QrScanner } from "./QrScanner";
import { CheckInModal } from "./CheckInModal";
import { api, ApiError } from "@/lib/api-client";
import { ToastStack, type ToastItem } from "./ToastStack";
import { VipAlertChannel } from "./VipAlertChannel";
import type { CheckInConfirmation } from "@/lib/types-checkin";

interface Props {
  eventId: string;
  deviceFingerprint: string;        // passed dari server
}

export function ScannerView({ eventId, deviceFingerprint }: Props) {
  const [paused, setPaused] = useState(false);
  const [confirmation, setConfirmation] = useState<CheckInConfirmation | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [manualQuery, setManualQuery] = useState("");
  const [manualPending, startManual] = useTransition();

  async function processScan(qrToken: string) {
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

  function onManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    const token = manualQuery.trim();
    startManual(async () => {
      await processScan(token);
      setManualQuery("");
    });
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

          {/* Manual search */}
          <div className="lg:col-span-2">
            <div className="heavy-frosted-glass flex h-full flex-col rounded-3xl p-6">
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Manual Search</p>
              <h3 className="mt-2 font-heading text-2xl text-white">Cari Tamu</h3>
              <p className="mt-2 text-xs text-white/40">
                Ketik nama atau tempel QR token bila kamera gagal.
              </p>

              <form onSubmit={onManualSearch} className="mt-6 flex flex-col gap-3">
                <input
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Nama tamu atau 64-char QR token…"
                  className="rounded-full border border-cockpit-10 bg-white/5 px-5 py-3 font-body text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={manualPending || !manualQuery.trim()}
                  className="rounded-full border border-cockpit-20 bg-white text-black px-5 py-3 text-xs uppercase tracking-[0.2em] transition hover:bg-white/90 disabled:opacity-50"
                >
                  {manualPending ? "Mencari…" : "Cek-In Manual"}
                </button>
              </form>

              <div className="mt-auto pt-6 text-[10px] text-white/30">
                Tombol "Cek-In Manual" mengirim QR token langsung ke API.
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