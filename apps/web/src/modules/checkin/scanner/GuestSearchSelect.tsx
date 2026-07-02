"use client";

// Searchable Guest Select — terima initial data dari parent (Server Component
// yang sudah pre-fetch dengan cookie auth). Filter & sort client-side.
import { useEffect, useMemo, useRef, useState } from "react";

export interface GuestLite {
  id: string;
  full_name: string;
  category: "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";
  qr_token: string;
  checked_in_at: string | null;
}

interface Props {
  guests: GuestLite[];        // pre-fetched by parent
  onPick: (guest: GuestLite) => void;
  disabled?: boolean;
  loadError?: string | null;
}

const CATEGORY_STYLES: Record<string, string> = {
  VVIP: "text-amber-300",
  VIP: "text-amber-200/80",
  MEDIA: "text-sky-300/80",
  REGULER: "text-white/60",
  STAFF: "text-emerald-300/80",
};

export function GuestSearchSelect({ guests, onPick, disabled, loadError }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-sort guests by name (server should also sort, but ensure here)
  const sortedGuests = useMemo(
    () => [...guests].sort((a, b) => a.full_name.localeCompare(b.full_name, "id", { sensitivity: "base" })),
    [guests],
  );

  // Filter client-side
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedGuests.slice(0, 50);
    return sortedGuests
      .filter((g) =>
        g.full_name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [sortedGuests, query]);

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
        placeholder={loadError ? "Gagal memuat" : "Cari nama tamu…"}
        disabled={disabled}
        className="w-full rounded-full border border-cockpit-10 bg-white/5 px-5 py-3 font-body text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
      />

      {open && !loadError && (
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