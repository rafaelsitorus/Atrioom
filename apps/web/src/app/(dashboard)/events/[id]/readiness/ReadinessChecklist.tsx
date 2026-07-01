"use client";

// Event Readiness Checklist + download/refresh UI.
import { useEffect, useState, useTransition } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb, type EventReadiness } from "@/modules/offline/db";
import { cacheRepo } from "@/modules/offline/cache";
import { fetchManifestAction } from "./actions";
import type { GuestRow, EventRow } from "@/lib/types";
import type { TableRow, SeatRow, AssignmentWithDetails } from "@/lib/types-seating";

interface ManifestResponse {
  event: EventRow | null;
  guests: GuestRow[];
  tables: TableRow[];
  seats: SeatRow[];
  assignments: AssignmentWithDetails[];
  fetched_at: string;
}

interface Props {
  eventId: string;
}

export function ReadinessChecklist({ eventId }: Props) {
  const [pending, start] = useTransition();
  const [downloadInfo, setDownloadInfo] = useState<{ count: number; ts: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const readiness = useLiveQuery<EventReadiness | undefined>(
    () => getDb().readiness.get(eventId) as Promise<EventReadiness | undefined>,
    [eventId],
  );

  // Hitung readiness real-time dari cache (reactive via useLiveQuery)
  const guestCount: number =
    (useLiveQuery(() => getDb().guests.where({ event_id: eventId }).count() as Promise<number>, [eventId]) as number | undefined) ?? 0;
  const tableCount: number =
    (useLiveQuery(() => getDb().tableList.where({ event_id: eventId }).count() as Promise<number>, [eventId]) as number | undefined) ?? 0;
  const assignmentCount: number =
    (useLiveQuery(() => getDb().assignments.where({ event_id: eventId }).count() as Promise<number>, [eventId]) as number | undefined) ?? 0;
  const seatCountFromCache: number =
    (useLiveQuery(
      async () => {
        const cachedTables = await getDb().tableList.where({ event_id: eventId }).toArray();
        const tableIds = new Set(cachedTables.map((t) => t.id));
        const allSeats = await getDb().seatList.toArray();
        return allSeats.filter((s) => tableIds.has(s.table_id)).length;
      },
      [eventId],
    ) as number | undefined) ?? 0;

  const checklist = [
    { key: "guests", label: "Guest Imported", value: guestCount, unit: "tamu", ok: guestCount > 0 },
    { key: "qr", label: "QR Generated", value: guestCount, unit: "QR (auto)", ok: guestCount > 0 },
    { key: "seating", label: "Seating Assigned", value: assignmentCount, unit: "kursi", ok: assignmentCount > 0, optional: true },
    { key: "tables", label: "Tables Defined", value: tableCount, unit: "meja", ok: tableCount > 0, optional: true },
    { key: "seats", label: "Seats Generated", value: seatCountFromCache, unit: "kursi", ok: seatCountFromCache > 0, optional: true },
    { key: "offline", label: "Offline Data Ready", value: readiness ? 1 : 0, unit: "", ok: !!readiness },
  ];

  async function download() {
    setError(null);
    start(async () => {
      try {
        const m = (await fetchManifestAction(eventId)) as ManifestResponse;
        const now = Date.now();

        // Bulk save ke IndexedDB
        await cacheRepo.saveEvent({
          id: m.event?.id ?? eventId,
          name: m.event?.name ?? "",
          venue: m.event?.venue ?? null,
          capacity: m.event?.capacity ?? null,
          starts_at: m.event?.starts_at ?? new Date().toISOString(),
          ends_at: m.event?.ends_at ?? null,
          status: m.event?.status ?? "DRAFT",
          updated_at: m.fetched_at,
        });

        await cacheRepo.saveGuestsBulk(
          (m.guests ?? []).map((g) => ({
            id: g.id,
            event_id: g.event_id,
            full_name: g.full_name,
            email: g.email,
            phone: g.phone,
            category: g.category,
            is_vip: g.is_vip,
            qr_token: g.qr_token,
            plus_one_count: g.plus_one_count,
            diet_notes: g.diet_notes,
            checked_in_at: g.checked_in_at,
            _downloaded_at: now,
            _source: "EVENT_DOWNLOAD" as const,
          })),
        );
        await cacheRepo.saveTablesBulk(
          (m.tables ?? []).map((t) => ({ ...t, _downloaded_at: now })),
        );
        await cacheRepo.saveSeatsBulk(
          (m.seats ?? []).map((s) => ({ ...s, _downloaded_at: now })),
        );
        await cacheRepo.saveAssignmentsBulk(
          (m.assignments ?? []).map((a) => ({ ...a, _downloaded_at: now })),
        );

        await cacheRepo.setReadiness({
          event_id: eventId,
          downloaded_at: now,
          guest_count: (m.guests ?? []).length,
          seat_count: (m.tables ?? []).length,
          assignment_count: (m.assignments ?? []).length,
          ready: true,
        });

        setDownloadInfo({ count: (m.guests ?? []).length, ts: now });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mengunduh manifest.");
      }
    });
  }

  async function clearCache() {
    if (!confirm("Hapus semua data offline untuk event ini?")) return;
    await cacheRepo.clearEvent(eventId);
    setDownloadInfo(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="heavy-frosted-glass rounded-3xl p-6">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Pre-Show</p>
        <h2 className="mt-2 font-heading text-3xl text-white">Event Readiness</h2>
        <p className="mt-2 text-sm text-white/60">
          Unduh data event ke perangkat untuk operasional front-desk tahan offline.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={download}
            disabled={pending}
            className="rounded-full border border-cockpit-20 bg-white px-6 py-3 text-xs uppercase tracking-[0.2em] text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {pending
              ? "Mengunduh…"
              : readiness
                ? "Refresh Data Offline"
                : "Download Event"}
          </button>
          {readiness && (
            <button
              onClick={clearCache}
              className="rounded-full border border-cockpit-20 px-6 py-3 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/5"
            >
              Hapus Cache
            </button>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-300/90">{error}</p>}
        {readiness && (
          <p className="mt-3 text-xs text-white/40">
            Last update: {new Date(readiness.downloaded_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-cockpit-10 border-t border-cockpit-10">
        {checklist.map((c) => (
          <li key={c.key} className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <StatusDot ok={c.ok} />
              <div>
                <p className="font-body text-base text-white">{c.label}</p>
                {c.optional && (
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">Opsional</p>
                )}
              </div>
            </div>
            <p className="font-heading text-2xl tabular-nums text-white/80">
              {c.value} <span className="text-xs uppercase tracking-[0.2em] text-white/40">{c.unit}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-white/5 bg-black/40 px-5 py-4 text-[10px] uppercase tracking-[0.25em] text-white/40">
        Catatan: tamu walk-in saat offline akan masuk ke Sync Queue & otomatis terkirim saat online.
      </div>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
        ok
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
          : "border-white/15 bg-transparent text-white/30"
      }`}
      title={ok ? "OK" : "Pending"}
    >
      {ok ? "✓" : "○"}
    </span>
  );
}