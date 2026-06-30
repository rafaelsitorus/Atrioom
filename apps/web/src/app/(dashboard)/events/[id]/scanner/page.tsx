import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { api } from "@/lib/api-client";
import type { EventRow } from "@/lib/types";
import { ScannerView } from "@/modules/checkin/scanner/ScannerView";

export const metadata = { title: "Scanner — Atrioom" };
export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function ScannerPage({ params }: PageProps) {
  const { id } = await params;

  let event: EventRow | null = null;
  try {
    event = await api.get<EventRow>(`/v1/events/${id}`);
  } catch {
    notFound();
  }
  if (!event) notFound();

  // Generate device fingerprint dari cookie + UA + IP (sederhana, deterministik per device).
  // Backend akan terima value ini untuk idempotency_key.
  const cookieStore = await cookies();
  const headerStore = await headers();
  let deviceId = cookieStore.get("atrioom-device")?.value;
  if (!deviceId) {
    const ua = headerStore.get("user-agent") ?? "unknown";
    const ip = headerStore.get("x-forwarded-for") ?? "local";
    deviceId = createHash("sha256").update(`${ua}|${ip}|${id}`).digest("hex").slice(0, 32);
    cookieStore.set("atrioom-device", deviceId, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  }

  return (
    <section className="flex flex-col gap-4">
      <header>
        <Link href="/events" className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white">
          ← Kembali ke Events
        </Link>
        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="font-heading text-3xl leading-tight text-white">
            Scanner · <span className="text-white/60">{event.name}</span>
          </h1>
          <Link
            href={`/events/${id}/live`}
            className="rounded-full border border-cockpit-20 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/10"
          >
            Live Dashboard →
          </Link>
        </div>
      </header>

      <ScannerView eventId={id} deviceFingerprint={deviceId} />
    </section>
  );
}