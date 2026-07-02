"use client";

// Searchable Guest Select — load semua guest event sekali, filter client-side.
// Lebih reliable daripada API call per keystroke (no CORS, no debounce).
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [allGuests, setAllGuests] = useState<GuestLite[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load semua guests sekali di mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Ambil dalam chunk 1000 (limit API). Untuk event <1000 guests,
        // 1 call cukup. Untuk >1000, perlu pagination — handle di iterasi berikut.
        const res = await api.get<{ rows: GuestLite[]; total: number }>(
          `/v1/events/${eventId}/guests?limit=1000`,
        );
        if (!alive) return;
        // Sort by full_name untuk konsistensi
        const sorted = [...res.rows].sort((a, b) =>
          a.full_name.localeCompare(b.full_name, "id", { sensitivity: "base" }),
        );
        setAllGuests(sorted);
        setLoaded(true);
      } catch (e) {
        if (!alive) return;
        setLoadError(e instanceof Error ? e.message : "Gagal memuat daftar tamu");
        setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [eventId]);

  // Filter client-side
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allGuests.slice(0, 50); // show 50 first
    return allGuests
      .filter((g) =>
        g.full_name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [allGuests, query]);

  // Reset active index saat query/results berubah
  useEffect(() => {
    setActiveIdx(0);
  }, [query, filtered.length]);

  function pick(guest: GuestLite) {
    onPick(guest);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIdx];
      if (target) pick(target);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onInputBlur() {
    // Delay supaya click pada item dropdown masih register
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    blurTimeout.current = setTimeout(() => setOpen(false), 200);
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
        onBlur={onInputBlur}
        onKeyDown={onKeyDown}
        placeholder={
          !loaded
            ? "Memuat daftar tamu…"
            : loadError
              ? "Gagal memuat"
              : "Cari nama tamu…"
        }
        disabled={disabled}
        className="w-full rounded-full border border-cockpit-10 bg-white/5 px-5 py-3 font-body text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
      />

      {open && !loadError && loaded && (
        <div
          onMouseDown={(e) => e.preventDefault()} /* keep focus on input */
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-cockpit-10 bg-black/95 backdrop-blur-md"
        >
          {filtered.length === 0 ? (
            <div className="px-5 py-4 text-center text-xs text-white/40">
              Tidak ada tamu cocok "{query}".
            </div>
          ) : (
            <ul>
              {filtered.map((g, i) => (
                <li
                  key={g.id}
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

      {loadError && (
        <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-950/30 px-4 py-3 text-xs text-red-200">
          Gagal memuat daftar tamu: {loadError}
          <br />
          <span className="text-red-300/70">Cek koneksi atau hubungi admin.</span>
        </div>
      )}
    </div>
  );
}