"use client";

// VipAlertChannel — subscribe ke Supabase Realtime channel untuk check_in_audit.
// Tampilkan recent check-ins di panel kanan; trigger toast untuk VIP baru.
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CheckInAuditRow } from "@/lib/types-checkin";
import type { ToastItem } from "./ToastStack";

interface Props {
  eventId: string;
  onLocalToast: (t: ToastItem) => void;
}

export function VipAlertChannel({ eventId, onLocalToast }: Props) {
  const [recent, setRecent] = useState<CheckInAuditRow[]>([]);
  const seenIds = useRef<Set<number>>(new Set());
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Initial fetch via REST API agar panel tidak kosong
    (async () => {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/check_in_audit?event_id=eq.${eventId}&order=scanned_at.desc&limit=20`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        });
        if (r.ok) {
          const data = (await r.json()) as CheckInAuditRow[];
          setRecent(data);
          data.forEach((row) => seenIds.current.add(row.id));
        }
      } catch { /* swallow */ }
    })();

    // Realtime subscription
    const channel = supabase
      .channel(`checkin-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "check_in_audit",
          filter: `event_id=eq.${eventId}`,
        },
        (msg) => {
          const row = msg.new as CheckInAuditRow;
          if (seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);

          setRecent((cur) => [row, ...cur].slice(0, 50));

          if (row.is_vip) {
            // Trigger local toast untuk VIP
            onLocalToast({
              id: String(row.id),
              kind: "walkin",
              title: `★ ${row.guest_name}`,
              message: `${row.guest_category} baru saja check-in`,
              ts: row.scanned_at ? new Date(row.scanned_at).getTime() : Date.now(),
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, supabase, onLocalToast]);

  if (recent.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-xs text-white/30">
        Belum ada check-in. Hasil akan muncul real-time.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-cockpit-10">
      {recent.map((row) => (
        <li
          key={row.id}
          className={`flex items-center gap-3 px-4 py-3 ${
            row.is_vip ? "bg-amber-400/[0.04]" : ""
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums ${
              row.is_vip
                ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                : "border-white/10 bg-white/5 text-white/70"
            }`}
          >
            {row.guest_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">
              {row.is_vip && <span className="mr-1 text-amber-300">★</span>}
              {row.guest_name}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              {row.guest_category}
              {row.table_label ? ` · ${row.table_label} · ${row.seat_label}` : ""}
            </p>
          </div>
          <span className="font-body text-[10px] tabular-nums text-white/40">
            {new Date(row.scanned_at).toLocaleTimeString("id-ID", {
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}