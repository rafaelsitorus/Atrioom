"use client";

// LiveDashboardView — counter + recent check-in feed via Supabase Realtime.
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { api } from "@/lib/api-client";
import type { CheckInAuditRow } from "@/lib/types-checkin";

interface Props { eventId: string }

export function LiveDashboardView({ eventId }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [items, setItems] = useState<CheckInAuditRow[]>([]);
  const supabase = getSupabaseBrowserClient();

  // Initial fetch
  useEffect(() => {
    (async () => {
      try {
        const stats = await api.get<{ total_success: number }>(`/v1/events/${eventId}/checkins/stats`);
        setCount(stats.total_success);
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/check_in_audit?event_id=eq.${eventId}&order=scanned_at.desc&limit=30`;
        const r = await fetch(url, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        });
        if (r.ok) setItems((await r.json()) as CheckInAuditRow[]);
      } catch { /* ignore */ }
    })();
  }, [eventId]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`live-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "check_in_audit", filter: `event_id=eq.${eventId}` },
        (msg) => {
          const row = msg.new as CheckInAuditRow;
          setItems((cur) => [row, ...cur].slice(0, 100));
          setCount((c) => (c === null ? 1 : c + 1));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, supabase]);

  const vipCount = items.filter((i) => i.is_vip).length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <Kpi label="Total Check-In" value={count ?? "—"} accent="white" />
      <Kpi label="VIP" value={vipCount} accent="amber" />
      <Kpi label="Last 30 Min" value={items.filter(within30Min).length} accent="white" />
      <div className="lg:col-span-1" />

      <div className="heavy-frosted-glass rounded-3xl p-6 lg:col-span-4">
        <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/40">Activity Feed</p>
        <ul className="divide-y divide-cockpit-10">
          {items.length === 0 ? (
            <li className="py-10 text-center text-xs text-white/30">
              Menunggu check-in pertama…
            </li>
          ) : items.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  row.is_vip
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                    : "border-white/10 bg-white/5 text-white/70"
                }`}
              >
                {row.is_vip && <span className="mr-0.5">★</span>}
                {row.guest_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{row.guest_name}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  {row.guest_category}
                  {row.table_label ? ` · ${row.table_label} ${row.seat_label}` : ""}
                </p>
              </div>
              <span className="font-body text-xs tabular-nums text-white/50">
                {new Date(row.scanned_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent: "white" | "amber" }) {
  return (
    <div className="heavy-frosted-glass rounded-3xl p-6">
      <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">{label}</p>
      <p className={`mt-3 font-heading text-5xl ${accent === "amber" ? "text-amber-300" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function within30Min(r: CheckInAuditRow): boolean {
  const t = new Date(r.scanned_at).getTime();
  return Date.now() - t < 30 * 60_000;
}