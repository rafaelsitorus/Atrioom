import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import type { EventRow } from "@/lib/types";
import { ReportsDashboard } from "./ReportsDashboard";

export const metadata = { title: "Reports — Atrioom" };
export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function ReportsPage({ params }: PageProps) {
  const { id } = await params;
  let event: EventRow | null = null;
  try {
    event = await api.get<EventRow>(`/v1/events/${id}`);
  } catch { notFound(); }
  if (!event) notFound();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <div>
          <Link href="/events" className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white">
            ← Kembali ke Events
          </Link>
          <h1 className="mt-2 font-heading text-4xl leading-tight text-white">
            Reports · <span className="text-white/60">{event.name}</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Statistik kehadiran, kategori, distribusi meja & walk-in.
          </p>
        </div>
        <Link
          href={`/events/${id}/downloads`}
          className="rounded-full border border-cockpit-20 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/10"
        >
          Download Center →
        </Link>
      </header>

      <ReportsDashboard eventId={id} />
    </section>
  );
}