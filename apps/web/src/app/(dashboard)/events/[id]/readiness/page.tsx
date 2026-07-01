import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import type { EventRow } from "@/lib/types";
import { ReadinessChecklist } from "./ReadinessChecklist";

export const metadata = { title: "Readiness — Atrioom" };
export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function ReadinessPage({ params }: PageProps) {
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
            Readiness · <span className="text-white/60">{event.name}</span>
          </h1>
        </div>
      </header>

      <ReadinessChecklist eventId={id} />
    </section>
  );
}