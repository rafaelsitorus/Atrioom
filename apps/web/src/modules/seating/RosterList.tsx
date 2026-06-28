"use client";

// RosterList — sidebar tamu yang belum punya kursi.
// Draggable via @dnd-kit. Search menggunakan store.
import { useDraggable } from "@dnd-kit/core";
import { useSeatingStore, useUnassignedGuests } from "./store";
import type { GuestLite } from "@/lib/types-seating";

export function RosterList() {
  const guests = useUnassignedGuests();
  const search = useSeatingStore((s) => s.search);
  const setSearch = useSeatingStore((s) => s.setSearch);

  return (
    <aside className="heavy-frosted-glass flex h-full w-80 shrink-0 flex-col rounded-3xl">
      <header className="border-b border-cockpit-10 px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Roster</p>
        <h2 className="font-heading text-2xl text-white">Tamu</h2>
        <p className="mt-1 text-xs text-white/40">
          {guests.length} belum punya kursi · Drag ke kanvas
        </p>
      </header>

      <div className="border-b border-cockpit-10 px-5 py-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama…"
          className="w-full rounded-full border border-cockpit-10 bg-white/5 px-4 py-2 font-body text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
        />
      </div>

      <ul className="flex-1 divide-y divide-cockpit-10 overflow-y-auto">
        {guests.length === 0 ? (
          <li className="px-5 py-10 text-center text-xs text-white/30">
            {search ? "Tidak ada hasil." : "Semua tamu sudah punya kursi."}
          </li>
        ) : (
          guests.map((g) => <DraggableGuest key={g.id} guest={g} />)
        )}
      </ul>
    </aside>
  );
}

function DraggableGuest({ guest }: { guest: GuestLite }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest:${guest.id}`,
  });

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex cursor-grab items-center gap-3 px-5 py-3 transition select-none hover:bg-white/[0.02] active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums ${
          guest.is_vip
            ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
            : "border-white/10 bg-white/5 text-white/60"
        }`}
      >
        {guest.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-sm text-white">{guest.full_name}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-white/40">
          {guest.category}
          {guest.plus_one_count > 0 ? ` · +${guest.plus_one_count}` : ""}
        </p>
      </div>
      {guest.is_vip && (
        <span className="text-amber-300" title="VIP">★</span>
      )}
    </li>
  );
}