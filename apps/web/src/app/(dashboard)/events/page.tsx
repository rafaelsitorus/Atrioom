import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";
import { CreateEventButton } from "./CreateEventButton";
import { EventArchiveButton } from "./EventArchiveButton";

export const metadata = { title: "Events — Atrioom" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Sementara pakai user.id sebagai orgId (single-tenant mode)
  let events: EventRow[] = [];
  try {
    events = await serverApi.get<EventRow[]>(`/v1/events?orgId=${user.id}&includeArchived=false`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to fetch events:", e);
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Pra-Acara</p>
          <h1 className="font-heading text-4xl leading-tight text-white">Daftar Event</h1>
          <p className="mt-2 text-sm font-body text-white/60">
            Kelola event aktif Anda. Total: {events.length}
          </p>
        </div>
        <CreateEventButton />
      </header>

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col divide-y divide-cockpit-10 border-t border-cockpit-10">
          {events.map((ev) => (
            <li key={ev.id} className="group grid grid-cols-12 items-baseline gap-4 py-6 transition hover:bg-white/[0.02]">
              <div className="col-span-5">
                <Link href={`/events/${ev.id}/guests`} className="block">
                  <p className="font-heading text-2xl text-white">{ev.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/40">
                    {ev.venue ?? "Venue belum ditentukan"}
                  </p>
                </Link>
              </div>
              <div className="col-span-3 text-xs text-white/60">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Mulai</p>
                <p className="mt-1 tabular-nums">{formatDate(ev.starts_at)}</p>
              </div>
              <div className="col-span-2 text-xs text-white/60">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Kapasitas</p>
                <p className="mt-1 tabular-nums">{ev.capacity ?? "—"}</p>
              </div>
              <div className="col-span-1 text-xs text-white/60">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Status</p>
                <p className="mt-1">
                  <StatusPill status={ev.status} />
                </p>
              </div>
              <div className="col-span-1 flex justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                <EventArchiveButton id={ev.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: EventRow["status"] }) {
  const colorMap: Record<EventRow["status"], string> = {
    DRAFT:     "text-white/40",
    PUBLISHED: "text-emerald-400/80",
    LIVE:      "text-emerald-400",
    CLOSED:    "text-white/30",
    ARCHIVED:  "text-white/20",
  };
  return (
    <span className={`text-[10px] uppercase tracking-[0.25em] ${colorMap[status]}`}>
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="heavy-frosted-glass rounded-3xl px-10 py-16 text-center">
      <p className="text-[10px] uppercase tracking-[0.4em] text-white/30">No Events Yet</p>
      <p className="mt-4 font-heading text-3xl text-white">Belum ada event</p>
      <p className="mt-3 text-sm text-white/50">Buat event pertama Anda untuk mulai menambahkan tamu.</p>
    </div>
  );
}