"use client";

// Check-In Confirmation Modal — aerospace styling.
// SUCCESS: glass white dengan inisial + detail.
// ALREADY: red-900 border.
// WALK_IN: gold accent VIP.
import type { CheckInConfirmation } from "@/lib/types-checkin";
import { useEffect } from "react";

interface Props {
  open: boolean;
  data: CheckInConfirmation | null;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  VVIP: "VVIP",
  VIP: "VIP",
  MEDIA: "Media",
  REGULER: "Reguler",
  STAFF: "Staff",
};

export function CheckInModal({ open, data, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !data) return null;

  const result = data.result;
  const guest = data.guest;
  const seating = data.seating;

  const resultColor =
    result === "SUCCESS"      ? "border-emerald-400/50" :
    result === "ALREADY_CHECKED_IN" ? "border-red-900/80" :
    result === "WALK_IN"      ? "border-amber-400/60" :
                                "border-white/20";

  const accentText =
    result === "SUCCESS"      ? "text-emerald-300" :
    result === "ALREADY_CHECKED_IN" ? "text-red-400" :
    result === "WALK_IN"      ? "text-amber-300" :
                                "text-white/70";

  const titleText =
    result === "SUCCESS"      ? "Check-In Berhasil" :
    result === "ALREADY_CHECKED_IN" ? "Sudah Check-In" :
    result === "WALK_IN"      ? "Walk-In Tercatat" :
                                "Tidak Dikenali";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`heavy-frosted-glass relative w-full max-w-lg overflow-hidden rounded-3xl border-2 ${resultColor}`}
        style={{
          boxShadow:
            result === "SUCCESS"
              ? "0 0 60px rgba(16,185,129,0.15)"
              : result === "ALREADY_CHECKED_IN"
                ? "0 0 60px rgba(127,29,29,0.3)"
                : result === "WALK_IN"
                  ? "0 0 60px rgba(251,191,36,0.18)"
                  : undefined,
        }}
      >
        {/* Header band */}
        <header className={`border-b ${resultColor} px-8 py-5`}>
          <p className={`text-[10px] uppercase tracking-[0.4em] ${accentText}`}>
            {result === "ALREADY_CHECKED_IN" ? "Duplicate" :
             result === "WALK_IN" ? "Walk-In" : "Confirmed"}
          </p>
          <h2 className="mt-1 font-heading text-3xl text-white">{titleText}</h2>
        </header>

        {/* Body */}
        {guest ? (
          <div className="px-8 py-7">
            {/* Guest name */}
            <p className="font-heading text-4xl leading-tight text-white">
              {guest.full_name}
            </p>

            {/* Category badge */}
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="rounded-full border border-cockpit-20 px-3 py-1 uppercase tracking-[0.25em] text-white/80">
                {CATEGORY_LABEL[guest.category]}
              </span>
              {guest.is_vip && (
                <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-amber-300">
                  ★ VIP
                </span>
              )}
              {guest.plus_one_count > 0 && (
                <span className="rounded-full border border-white/20 px-3 py-1 text-white/60">
                  +{guest.plus_one_count}
                </span>
              )}
            </div>

            {/* Seating info */}
            {seating && (
              <div className="mt-6 grid grid-cols-2 gap-4 border-y border-cockpit-10 py-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Meja</p>
                  <p className="mt-1 font-body text-base text-white">{seating.table_label}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Kursi</p>
                  <p className="mt-1 font-body text-base text-white">{seating.seat_label}</p>
                </div>
              </div>
            )}

            {/* Diet/Allergy alert */}
            {guest.diet_notes && (
              <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300">Catatan Diet / Alergi</p>
                <p className="mt-1 font-body text-sm text-amber-100">{guest.diet_notes}</p>
              </div>
            )}

            {/* Duplicate timestamp */}
            {result === "ALREADY_CHECKED_IN" && data.previous_scan_at && (
              <div className="mt-5 rounded-2xl border border-red-900/50 bg-red-950/30 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-red-300">Check-In Sebelumnya</p>
                <p className="mt-1 font-body text-sm text-red-200">
                  {new Date(data.previous_scan_at).toLocaleString("id-ID", {
                    dateStyle: "medium", timeStyle: "short",
                  })}
                </p>
              </div>
            )}

            {/* Generic message */}
            <p className="mt-6 text-center text-sm font-body text-white/70">
              {data.message}
            </p>
          </div>
        ) : (
          <div className="px-8 py-10 text-center text-sm text-white/60">
            {data.message}
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-cockpit-10 px-8 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-full border border-cockpit-20 py-3 text-xs uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/5"
          >
            Tutup (Esc)
          </button>
        </footer>
      </div>
    </div>
  );
}