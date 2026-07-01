import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import type { EventRow } from "@/lib/types";
import { DownloadCenter } from "./DownloadCenter";

export const metadata = { title: "Downloads — Atrioom" };
export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function DownloadsPage({ params }: PageProps) {
  const { id } = await params;
  let event: EventRow | null = null;
  try {
    event = await serverApi.get<EventRow>(`/v1/events/${id}`);
  } catch { notFound(); }
  if (!event) notFound();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <Link href="/events" className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white">
          ← Kembali ke Events
        </Link>
        <h1 className="mt-2 font-heading text-4xl leading-tight text-white">
          Downloads · <span className="text-white/60">{event.name}</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Pusat unduhan laporan untuk event ini.
        </p>
      </header>

      <DownloadCenter eventId={id} />
    </section>
  );
}