import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import type { EventRow, GuestRow } from "@/lib/types";
import { WalkInButton } from "./WalkInButton";
import { ImportTrigger } from "./ImportTrigger";
import { GuestActions } from "./GuestActions";
import { CategoryBadge } from "./CategoryBadge";

export const metadata = { title: "Guests — Atrioom" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; cat?: string }>;
}

export default async function GuestsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  let event: EventRow | null = null;
  let guests: GuestRow[] = [];
  let total = 0;

  try {
    event = await api.get<EventRow>(`/v1/events/${id}`);
    const res = await api.get<{ rows: GuestRow[]; total: number }>(
      `/v1/events/${id}/guests?limit=500${sp.cat ? `&category=${sp.cat}` : ""}${sp.q ? `&search=${encodeURIComponent(sp.q)}` : ""}`,
    );
    guests = res.rows;
    total = res.total;
  } catch (e) {
    notFound();
  }
  if (!event) notFound();

  return (
    <section className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <Link href="/events" className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white">
          ← Kembali ke Events
        </Link>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Event</p>
            <h1 className="font-heading text-4xl leading-tight text-white">{event.name}</h1>
            <p className="mt-2 text-sm font-body text-white/60">
              {total} tamu · {event.venue ?? "Venue belum ditentukan"}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/events/${id}/seating`}
              className="rounded-full border border-cockpit-20 bg-white/5 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/10"
            >
              Seating
            </Link>
            <Link
              href={`/events/${id}/scanner`}
              className="rounded-full border border-cockpit-20 bg-white/5 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/10"
            >
              Scanner
            </Link>
            <ImportTrigger eventId={id} />
            <WalkInButton eventId={id} />
          </div>
        </div>
      </header>

      {/* Filter bar — minimalist */}
      <form className="flex items-center gap-4 border-y border-cockpit-10 py-3">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Cari nama tamu…"
          className="flex-1 bg-transparent px-2 py-1 font-body text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        <select
          name="cat"
          defaultValue={sp.cat ?? ""}
          className="rounded-full border border-cockpit-10 bg-white/5 px-4 py-1.5 font-body text-xs uppercase tracking-[0.2em] text-white/70 focus:outline-none"
        >
          <option value="" className="bg-black">Semua</option>
          <option value="VVIP" className="bg-black">VVIP</option>
          <option value="VIP" className="bg-black">VIP</option>
          <option value="MEDIA" className="bg-black">MEDIA</option>
          <option value="REGULER" className="bg-black">REGULER</option>
          <option value="STAFF" className="bg-black">STAFF</option>
        </select>
        <button
          type="submit"
          className="rounded-full border border-cockpit-10 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white/60 hover:border-white/30 hover:text-white"
        >
          Terapkan
        </button>
      </form>

      {/* Tabel aerospace */}
      <GuestsTable guests={guests} eventId={id} />
    </section>
  );
}

function GuestsTable({ guests, eventId }: { guests: GuestRow[]; eventId: string }) {
  if (guests.length === 0) {
    return (
      <div className="heavy-frosted-glass rounded-3xl px-10 py-16 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/30">No Guests</p>
        <p className="mt-4 font-heading text-3xl text-white">Belum ada tamu</p>
        <p className="mt-3 text-sm text-white/50">Upload Excel atau tambahkan tamu walk-in untuk memulai.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-cockpit-10">
      <div className="grid grid-cols-12 gap-3 border-b border-cockpit-10 px-4 py-3">
        <HeaderCell className="col-span-4">Nama</HeaderCell>
        <HeaderCell className="col-span-2">Kategori</HeaderCell>
        <HeaderCell className="col-span-2">Status</HeaderCell>
        <HeaderCell className="col-span-2">Plus-One</HeaderCell>
        <HeaderCell className="col-span-2 text-right">Aksi</HeaderCell>
      </div>
      <ul className="divide-y divide-cockpit-10">
        {guests.map((g) => (
          <li
            key={g.id}
            className="group grid grid-cols-12 items-baseline gap-3 px-4 py-4 transition hover:bg-white/[0.015]"
          >
            <div className="col-span-4">
              <p className="font-body text-base text-white">{g.full_name}</p>
              {g.diet_notes && (
                <p className="mt-1 text-xs text-amber-400/70" title="Catatan diet/alergi">
                  ⚠ {g.diet_notes}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <CategoryBadge category={g.category} isVip={g.is_vip} />
            </div>
            <div className="col-span-2">
              <CheckInStatus guest={g} />
            </div>
            <div className="col-span-2 font-body text-sm tabular-nums text-white/70">
              {g.plus_one_count > 0 ? `+${g.plus_one_count}` : "—"}
            </div>
            <div className="col-span-2 flex justify-end opacity-0 transition group-hover:opacity-100">
              <GuestActions eventId={eventId} guestId={g.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeaderCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] uppercase tracking-[0.3em] text-white/40 ${className}`}>{children}</p>
  );
}

function CheckInStatus({ guest }: { guest: GuestRow }) {
  if (guest.checked_in_at) {
    return (
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Checked In</p>
        <p className="mt-1 text-[10px] tabular-nums text-white/40">
          {new Date(guest.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    );
  }
  return <p className="text-xs uppercase tracking-[0.2em] text-white/30">Belum</p>;
}