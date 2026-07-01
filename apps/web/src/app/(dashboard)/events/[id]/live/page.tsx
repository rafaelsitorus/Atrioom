// Live Dashboard — read-only view dari check_in_audit via Supabase Realtime.
// Tampilkan counter + recent activity. Ini adalah stub untuk EPIC05 nanti.
import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { EventRow } from "@/lib/types";
import { LiveDashboardView } from "@/modules/checkin/scanner/LiveDashboardView";

export const metadata = { title: "Live — Atrioom" };
export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function LivePage({ params }: PageProps) {
  const { id } = await params;

  let event: EventRow | null = null;
  try {
    event = await api.get<EventRow>(`/v1/events/${id}`);
  } catch { notFound(); }
  if (!event) notFound();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <Link href="/events" className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white">
          ← Kembali ke Events
        </Link>
        <h1 className="mt-2 font-heading text-4xl leading-tight text-white">
          Live · <span className="text-white/60">{event.name}</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">Pantau check-in real-time dari semua perangkat front-desk.</p>
      </header>

      <LiveDashboardView eventId={id} />
    </section>
  );
}