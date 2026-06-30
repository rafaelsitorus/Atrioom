// Public ticket page — accessible by guest tanpa login.
// Rute: /ticket/[id]  dimana [id] = qr_token (32-char hex).
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { env } from "@/lib/env";

interface PageProps { params: Promise<{ id: string }> }

interface TicketData {
  id: string;
  full_name: string;
  category: "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";
  is_vip: boolean;
  qr_token: string;
  event_id: string;
  events: { name: string; starts_at: string; venue: string | null };
}

export const dynamic = "force-dynamic"; // selalu fetch latest

async function fetchTicket(token: string): Promise<TicketData | null> {
  // PUBLIC endpoint — tidak butuh auth, browser bisa hit langsung
  const res = await fetch(`${env.INTERNAL_API_BASE_URL}/v1/public/ticket/${token}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as TicketData;
}

export default async function TicketPage({ params }: PageProps) {
  const { id } = await params;
  const ticket = await fetchTicket(id);
  if (!ticket) notFound();

  // Generate QR code sebagai PNG data URL — tampil di tengah kartu
  const qrDataUrl = await QRCode.toDataURL(ticket.qr_token, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 480,
    color: { dark: "#FFFFFF", light: "#00000000" }, // transparent bg, white fg
  });

  const startsAt = new Date(ticket.events.starts_at);
  const dateLabel = startsAt.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const timeLabel = startsAt.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Decorative background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Atrioom · Digital Ticket</p>
        </div>

        {/* Card */}
        <div className="heavy-frosted-glass relative w-full rounded-3xl px-8 py-10">
          {/* Top: category badge */}
          <div className="mb-6 flex items-center justify-center">
            <CategoryPill category={ticket.category} isVip={ticket.is_vip} />
          </div>

          {/* Guest name */}
          <div className="mb-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Nama Tamu</p>
            <h1 className="mt-2 font-heading text-4xl leading-tight text-white">
              {ticket.full_name}
            </h1>
            {ticket.is_vip && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-amber-300/80">
                ★ Priority Access
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl border border-white/20 bg-white p-4">
              <img
                src={qrDataUrl}
                alt="QR Code tiket"
                width={240}
                height={240}
                className="block h-60 w-60"
              />
            </div>
          </div>

          {/* Event info */}
          <div className="border-t border-cockpit-10 pt-6">
            <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/40">Detail Acara</p>
            <p className="font-heading text-2xl leading-tight text-white">{ticket.events.name}</p>
            <div className="mt-3 space-y-1 font-body text-sm text-white/60">
              <p>{dateLabel}</p>
              <p>{timeLabel} WIB</p>
              {ticket.events.venue && <p>{ticket.events.venue}</p>}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
          Tunjukkan QR ini di entrance · Encrypted token
        </p>
      </div>
    </main>
  );
}

function CategoryPill({
  category, isVip,
}: { category: TicketData["category"]; isVip: boolean }) {
  const styles: Record<TicketData["category"], string> = {
    VVIP:    "border-amber-400/60 bg-amber-400/10 text-amber-200",
    VIP:     "border-amber-400/40 bg-amber-400/5 text-amber-300",
    MEDIA:   "border-sky-400/40 bg-sky-400/5 text-sky-300",
    REGULER: "border-white/20 bg-white/5 text-white/70",
    STAFF:   "border-emerald-400/40 bg-emerald-400/5 text-emerald-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-1.5 text-[10px] uppercase tracking-[0.3em] ${styles[category]}`}
    >
      {isVip && <span>★</span>}
      {category}
    </span>
  );
}