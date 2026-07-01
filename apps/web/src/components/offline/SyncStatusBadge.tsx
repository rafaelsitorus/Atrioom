"use client";

// Badge kecil tetap di pojok kanan-bawah: jumlah item pending sync + last sync time.
import { useEffect, useState } from "react";
import { syncQueue } from "@/modules/offline/sync";

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function SyncStatusBadge() {
  const [pending, setPending] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let alive = true;
    async function refresh() {
      try {
        const [p, last] = await Promise.all([
          syncQueue.countPending(),
          syncQueue.lastSyncAt(),
        ]);
        if (!alive) return;
        setPending(p);
        setLastSync(last);
      } catch { /* ignore */ }
    }
    refresh();
    const id = setInterval(refresh, 4000);
    const forceTick = () => setTick((t) => t + 1);
    window.addEventListener("atrioom:sync-end", forceTick);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("atrioom:sync-end", forceTick);
    };
  }, []);

  if (pending === null) return null;

  const hasPending = pending > 0;

  return (
    <div
      className={`fixed bottom-4 left-4 z-30 rounded-2xl border px-4 py-2 backdrop-blur-md ${
        hasPending
          ? "border-amber-400/30 bg-amber-400/5"
          : "border-cockpit-10 bg-black/70"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Sync</p>
      <p className="mt-0.5 font-body text-xs text-white/80">
        {hasPending ? (
          <>
            <span className="text-amber-300">{pending}</span> in queue
          </>
        ) : (
          <>All synced</>
        )}
      </p>
      {lastSync && (
        <p className="mt-0.5 text-[10px] text-white/40">last: {timeAgo(lastSync)}</p>
      )}
    </div>
  );
}