import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import type { EventRow, GuestRow } from "@/lib/types";
import type { TableRow, SeatRow, AssignmentWithDetails, GuestLite } from "@/lib/types-seating";
import { SeatingView } from "@/modules/seating/SeatingView";

export const metadata = { title: "Seating — Atrioom" };

interface PageProps { params: Promise<{ id: string }> }

export default async function SeatingPage({ params }: PageProps) {
  const { id } = await params;

  let event: EventRow | null = null;
  let tables: TableRow[] = [];
  let seats: SeatRow[] = [];
  let assignments: AssignmentWithDetails[] = [];
  let guests: GuestLite[] = [];

  try {
    event = await serverApi.get<EventRow>(`/v1/events/${id}`);
    const [tablesData, seatsData, assignmentsData, guestsData] = await Promise.all([
      serverApi.get<TableRow[]>(`/v1/events/${id}/tables`),
      serverApi.get<SeatRow[]>(`/v1/events/${id}/seats`),
      serverApi.get<AssignmentWithDetails[]>(`/v1/events/${id}/assignments`),
      serverApi.get<{ rows: GuestRow[]; total: number }>(`/v1/events/${id}/guests?limit=1000`),
    ]);
    tables = tablesData;
    seats = seatsData;
    assignments = assignmentsData;
    const assignedGuestIds = new Set(assignments.map((a) => a.guest_id));
    guests = guestsData.rows
      .filter((g) => !assignedGuestIds.has(g.id))
      .map((g) => ({
        id: g.id,
        full_name: g.full_name,
        category: g.category,
        is_vip: g.is_vip,
        email: g.email,
        phone: g.phone,
        plus_one_count: g.plus_one_count,
      }));
  } catch {
    notFound();
  }
  if (!event) notFound();

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <Link href={`/events/${id}/guests`} className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white">
            ← Kembali ke Guests
          </Link>
          <h1 className="mt-2 font-heading text-3xl leading-tight text-white">
            Seating · <span className="text-white/60">{event.name}</span>
          </h1>
        </div>
      </header>

      <SeatingView
        eventId={id}
        initialTables={tables}
        initialSeats={seats}
        initialAssignments={assignments}
        initialGuests={guests}
      />
    </section>
  );
}