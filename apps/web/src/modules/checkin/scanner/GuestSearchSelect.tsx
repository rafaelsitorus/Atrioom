"use client";

// Searchable Guest Select — type nama, list filtered, click/Enter to pick.
// Dirancang untuk manual check-in flow: pengganti raw input field.
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

export interface GuestLite {
  id: string;
  full_name: string;
  category: "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";
  qr_token: string;
  checked_in_at: string | null;
}

interface Props {
  eventId: string;
  onPick: (guest: GuestLite) => void;
  disabled?: boolean;
}

const CATEGORY_STYLES: Record<string, string> = {
  VVIP: "text-amber-300",
  VIP: "text-amber-200/80",
  MEDIA: "text-sky-300/80",
  REGULER: "text-white/60",
  STAFF: "text-emerald-300/80",
};

export function GuestSearchSelect({ eventId, onPick, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<GuestLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<{ rows: GuestLite[]; total: number }>(
          `/v1/events/${eventId}/guests?search=${encodeURIComponent(query.trim())}&limit=20`,
        );
        // Debug: log response untuk diagnosa kenapa dropdown kosong
        // eslint-disable-next-line no-console
        console.log("[GuestSearchSelect] search response:", { query, total: res.total, count: res.rows.length, sample: res.rows[0] });
        setResults(res.rows);
        setActiveIdx(0);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[GuestSearchSelect] search error:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, eventId]);

  function pick(guest: GuestLite) {
    onPick(guest);
    setQuery("");
    setOpen(false);
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIdx];
      if (target) pick(target);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={onKeyDown}
        placeholder="Cari nama tamu…"
        disabled={disabled}
        className="w-full rounded-full border border-cockpit-10 bg-white/5 px-5 py-3 font-body text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
      />
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-cockpit-10 bg-black/95 backdrop-blur-md">
          {loading ? (
            <div className="px-5 py-4 text-center text-xs text-white/40">Mencari…</div>
          ) : results.length === 0 ? (
            <div className="px-5 py-4 text-center text-xs text-white/40">
              Tidak ada tamu cocok "{query}".
            </div>
          ) : (
            <ul>
              {results.map((g, i) => (
                <li
                  key={g.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(g)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-5 py-3 transition ${
                    i === activeIdx ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-body text-sm text-white">{g.full_name}</span>
                    <span className={`mt-0.5 text-[10px] uppercase tracking-[0.2em] ${CATEGORY_STYLES[g.category]}`}>
                      {g.category}
                      {g.checked_in_at ? " · sudah hadir" : ""}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/30">
                    {i === activeIdx ? "↵" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}