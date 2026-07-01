"use client";

// Reports Dashboard — agregat stats + visualisasi.
import { useEffect, useState, useTransition } from "react";
import { api } from "@/lib/api-client";
import type { DashboardData } from "@/lib/types-reporting";

interface Props { eventId: string }

export function ReportsDashboard({ eventId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, startExport] = useTransition();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get<DashboardData>(`/v1/events/${eventId}/reports/dashboard`);
        if (alive) setData(r);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Gagal memuat report.");
      }
    })();
    return () => { alive = false; };
  }, [eventId]);

  function downloadExcel() {
    startExport(async () => {
      try {
        const baseUrl = (await import("@/lib/env")).env.INTERNAL_API_BASE_URL;
        const res = await fetch(`${baseUrl}/v1/events/${eventId}/reports/export`, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `atrioom-report-${eventId}-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Export gagal.");
      }
    });
  }

  if (error) {
    return (
      <div className="heavy-frosted-glass rounded-3xl px-10 py-16 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-red-300/80">Error</p>
        <p className="mt-3 text-sm text-white/60">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="heavy-frosted-glass rounded-3xl px-10 py-16 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/30">Memuat</p>
        <p className="mt-3 text-sm text-white/60">Mengambil data report…</p>
      </div>
    );
  }

  const s = data.summary;
  const peakHour = data.hourly.reduce((max, h) => (h.count > max.count ? h : max), { hour: "—", count: 0 });

  return (
    <div className="flex flex-col gap-6">
      {/* Top: Export + summary */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Live Statistics</p>
        <button
          onClick={downloadExcel}
          disabled={exporting}
          className="rounded-full border border-cockpit-20 bg-white px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-black transition hover:bg-white/90 disabled:opacity-50"
        >
          {exporting ? "Membuat Excel…" : "Export Excel"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Total Tamu" value={s.total_guests} accent="white" />
        <Kpi label="Hadir" value={s.total_checked_in} accent="emerald" />
        <Kpi label="Belum Hadir" value={s.total_not_checked_in} accent="white" />
        <Kpi label="Walk-In" value={s.total_walk_in} accent="amber" />
        <Kpi label="Tingkat Hadir" value={`${(s.attendance_rate * 100).toFixed(1)}%`} accent="white" />
      </div>

      {/* Category breakdown */}
      <Panel title="Kategori">
        <ul className="divide-y divide-cockpit-10">
          {data.categories.map((c) => {
            const rate = c.total > 0 ? c.checked_in / c.total : 0;
            return (
              <li key={c.category} className="grid grid-cols-12 items-baseline gap-3 py-3">
                <div className="col-span-3 text-xs uppercase tracking-[0.25em] text-white/80">{c.category}</div>
                <div className="col-span-3 text-xs text-white/50">
                  {c.checked_in} / {c.total} hadir
                </div>
                <div className="col-span-6">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-white/80" style={{ width: `${rate * 100}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
          {data.categories.length === 0 && (
            <li className="py-6 text-center text-xs text-white/30">Belum ada data.</li>
          )}
        </ul>
      </Panel>

      {/* Hourly distribution */}
      <Panel title="Distribusi Check-In per Jam">
        {data.hourly.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">Belum ada check-in.</p>
        ) : (
          <div className="flex items-end gap-2 pt-4" style={{ height: 160 }}>
            {data.hourly.map((h) => {
              const max = Math.max(...data.hourly.map((x) => x.count), 1);
              const heightPct = (h.count / max) * 100;
              const isPeak = h.hour === peakHour.hour;
              return (
                <div key={h.hour} className="flex flex-1 flex-col items-center gap-2">
                  <span className="font-body text-[10px] tabular-nums text-white/60">{h.count}</span>
                  <div
                    className={`w-full rounded-t ${isPeak ? "bg-white" : "bg-white/40"}`}
                    style={{ height: `${heightPct}%`, minHeight: 2 }}
                  />
                  <span className="font-body text-[10px] tabular-nums text-white/40">{h.hour}</span>
                </div>
              );
            })}
          </div>
        )}
        {peakHour.count > 0 && (
          <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-white/40">
            Peak hour: {peakHour.hour} ({peakHour.count} check-in)
          </p>
        )}
      </Panel>

      {/* Table occupancy */}
      <Panel title="Okupansi Meja">
        {data.tables.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">Belum ada meja.</p>
        ) : (
          <ul className="divide-y divide-cockpit-10">
            {data.tables.map((t) => {
              const rate = t.capacity > 0 ? t.checked_in / t.capacity : 0;
              return (
                <li key={t.table_id} className="grid grid-cols-12 items-baseline gap-3 py-3">
                  <div className="col-span-2 font-body text-sm text-white">{t.table_label}</div>
                  <div className="col-span-2 text-xs text-white/50">{t.capacity} kursi</div>
                  <div className="col-span-2 text-xs text-white/50">{t.checked_in} hadir</div>
                  <div className="col-span-6">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full bg-white/80" style={{ width: `${rate * 100}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* VIP Attendance */}
      <Panel title="VIP Attendance">
        {data.vip.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">Tidak ada tamu VIP.</p>
        ) : (
          <ul className="divide-y divide-cockpit-10">
            {data.vip.map((v) => (
              <li key={v.guest_id} className="flex items-baseline gap-4 py-3">
                <span className="font-body text-sm text-amber-300">★ {v.guest_name}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-white/40">{v.category}</span>
                <span className="text-xs text-white/60">
                  {v.table_label ?? "—"} · {v.checked_in_at ? new Date(v.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Belum hadir"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Walk-In */}
      <Panel title="Walk-In List">
        {data.walkin.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">Tidak ada walk-in.</p>
        ) : (
          <ul className="divide-y divide-cockpit-10">
            {data.walkin.map((w) => (
              <li key={w.guest_id} className="flex items-baseline justify-between gap-4 py-3">
                <div>
                  <p className="font-body text-sm text-white">{w.guest_name}</p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">{w.category}</p>
                </div>
                <div className="text-right text-xs text-white/50">
                  <p>{new Date(w.registered_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
                  <p className="text-[10px] text-white/30">
                    {w.checked_in_at ? `Hadir ${new Date(w.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Belum hadir"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent: "white" | "emerald" | "amber" }) {
  const color = accent === "emerald" ? "text-emerald-300" : accent === "amber" ? "text-amber-300" : "text-white";
  return (
    <div className="heavy-frosted-glass rounded-3xl p-6">
      <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">{label}</p>
      <p className={`mt-3 font-heading text-4xl ${color}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="heavy-frosted-glass rounded-3xl p-6">
      <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/40">{title}</p>
      {children}
    </div>
  );
}