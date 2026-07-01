"use client";

// Download Center — list of available reports dengan local history.
import { useEffect, useState, useTransition } from "react";
import { api } from "@/lib/api-client";
import type { DashboardData } from "@/lib/types-reporting";

interface Props { eventId: string }

interface DownloadEntry {
  id: string;
  filename: string;
  type: "attendance" | "manifest" | "walkin" | "vip";
  downloadedAt: number;
}

const STORAGE_KEY = "atrioom-download-history";

export function DownloadCenter({ eventId }: Props) {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<DownloadEntry[]>([]);
  const [pending, startTransition] = useTransition();

  // Hydrate history dari localStorage (keyed by eventId)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}:${eventId}`);
      if (raw) setHistory(JSON.parse(raw) as DownloadEntry[]);
    } catch { /* ignore */ }
    (async () => {
      try {
        const r = await api.get<DashboardData>(`/v1/events/${eventId}/reports/dashboard`);
        setStats(r);
      } catch { /* ignore */ }
    })();
  }, [eventId]);

  function record(entry: DownloadEntry) {
    setHistory((cur) => {
      const next = [entry, ...cur].slice(0, 20);
      try {
        localStorage.setItem(`${STORAGE_KEY}:${eventId}`, JSON.stringify(next));
      } catch { /* quota / private mode */ }
      return next;
    });
  }

  function download(type: DownloadEntry["type"], filename: string, fetcher: () => Promise<Blob>) {
    startTransition(async () => {
      try {
        const blob = await fetcher();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        record({ id: String(Date.now()), filename, type, downloadedAt: Date.now() });
      } catch (e) {
        alert(e instanceof Error ? e.message : "Gagal mengunduh.");
      }
    });
  }

  async function fetchAttendanceExcel(): Promise<Blob> {
    const baseUrl = (await import("@/lib/env")).env.INTERNAL_API_BASE_URL;
    const res = await fetch(`${baseUrl}/v1/events/${eventId}/reports/export`, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  }

  async function fetchGuestsCsv(): Promise<Blob> {
    const data = await api.get<{ rows: Array<{ full_name: string; category: string; email: string | null; phone: string | null; checked_in_at: string | null }>; total: number }>(
      `/v1/events/${eventId}/guests?limit=2000`,
    );
    const header = ["Full Name", "Category", "Email", "Phone", "Checked In At"];
    const lines = [header.join(",")];
    for (const g of data.rows) {
      lines.push([
        `"${g.full_name.replace(/"/g, '""')}"`,
        g.category,
        g.email ?? "",
        g.phone ?? "",
        g.checked_in_at ?? "",
      ].join(","));
    }
    return new Blob([lines.join("\n")], { type: "text/csv" });
  }

  async function fetchVipCsv(): Promise<Blob> {
    const data = await api.get<DashboardData>(`/v1/events/${eventId}/reports/dashboard`);
    const lines = [["Name", "Category", "Checked In At", "Table"]];
    for (const v of data.vip) {
      lines.push([
        `"${v.guest_name.replace(/"/g, '""')}"`,
        v.category,
        v.checked_in_at ?? "",
        v.table_label ?? "",
      ]);
    }
    return new Blob([lines.map((l) => l.join(",")).join("\n")], { type: "text/csv" });
  }

  async function fetchWalkInCsv(): Promise<Blob> {
    const data = await api.get<DashboardData>(`/v1/events/${eventId}/reports/dashboard`);
    const lines = [["Name", "Category", "Registered At", "Checked In At"]];
    for (const w of data.walkin) {
      lines.push([`"${w.guest_name.replace(/"/g, '""')}"`, w.category, w.registered_at, w.checked_in_at ?? ""]);
    }
    return new Blob([lines.map((l) => l.join(",")).join("\n")], { type: "text/csv" });
  }

  const reports: Array<{
    key: DownloadEntry["type"];
    title: string;
    desc: string;
    ext: string;
    filename: string;
    fetcher: () => Promise<Blob>;
  }> = [
    {
      key: "attendance",
      title: "Attendance Report (Excel)",
      desc: "5-sheet workbook: Summary, All Guests, Walk-In, VIP, Activity.",
      ext: "xlsx",
      filename: `atrioom-attendance-${eventId}.xlsx`,
      fetcher: fetchAttendanceExcel,
    },
    {
      key: "manifest",
      title: "Guest List (CSV)",
      desc: "Semua tamu dengan status check-in — cocok untuk spreadsheet umum.",
      ext: "csv",
      filename: `atrioom-guests-${eventId}.csv`,
      fetcher: fetchGuestsCsv,
    },
    {
      key: "vip",
      title: "VIP Attendance (CSV)",
      desc: "Daftar VIP dan waktu kedatangan mereka.",
      ext: "csv",
      filename: `atrioom-vip-${eventId}.csv`,
      fetcher: fetchVipCsv,
    },
    {
      key: "walkin",
      title: "Walk-In List (CSV)",
      desc: "Daftar tamu walk-in & waktu registrasi.",
      ext: "csv",
      filename: `atrioom-walkin-${eventId}.csv`,
      fetcher: fetchWalkInCsv,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="heavy-frosted-glass rounded-3xl p-6">
          <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/40">Available Reports</p>
          <ul className="divide-y divide-cockpit-10">
            {reports.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-body text-base text-white">{r.title}</p>
                  <p className="mt-1 text-xs text-white/50">{r.desc}</p>
                </div>
                <button
                  disabled={pending}
                  onClick={() => download(r.key, r.filename, r.fetcher)}
                  className="shrink-0 rounded-full border border-cockpit-20 bg-white px-5 py-2 text-[10px] uppercase tracking-[0.25em] text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {pending ? "…" : `Download ${r.ext.toUpperCase()}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="heavy-frosted-glass rounded-3xl p-6">
        <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/40">Riwayat Unduhan</p>
        {history.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">Belum ada unduhan.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="border-b border-cockpit-10 pb-2">
                <p className="font-body text-xs text-white">{h.filename}</p>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                  {new Date(h.downloadedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </li>
            ))}
          </ul>
        )}
        {stats && (
          <div className="mt-6 border-t border-cockpit-10 pt-4">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Saat Ini</p>
            <p className="mt-2 font-heading text-3xl text-white">{stats.summary.total_checked_in} / {stats.summary.total_guests}</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">hadir / total</p>
          </div>
        )}
      </aside>
    </div>
  );
}