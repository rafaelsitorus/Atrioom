"use client";

// Wrapper DndContext + handler untuk seluruh halaman seating.
// Menghubungkan roster ↔ canvas dengan Zustand sebagai single source of truth.
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useEffect, useTransition } from "react";
import { api } from "@/lib/api-client";
import { useSeatingStore } from "./store";
import { SpatialCanvas } from "./SpatialCanvas";
import { RosterList } from "./RosterList";
import { TableCreator } from "./TableCreator";
import { handleSeatDrop } from "./DropTarget";
import type { AssignmentWithDetails, GuestLite, SeatRow, TableRow } from "@/lib/types-seating";

interface Props {
  eventId: string;
  initialTables: TableRow[];
  initialSeats: SeatRow[];
  initialAssignments: AssignmentWithDetails[];
  initialGuests: GuestLite[];
}

export function SeatingView(props: Props) {
  const hydrate = useSeatingStore((s) => s.hydrate);
  const guests = useSeatingStore((s) => s.guests);
  const [, startUndo] = useTransition();

  useEffect(() => {
    hydrate({
      eventId: props.eventId,
      tables: props.initialTables,
      seats: props.initialSeats,
      assignments: props.initialAssignments,
      guests: props.initialGuests,
    });
  }, [hydrate, props]);

  async function onDragEnd(e: DragEndEvent) {
    const overId = e.over?.id?.toString();
    const activeId = e.active.id.toString();
    if (!overId?.startsWith("seat:")) return;
    if (!activeId.startsWith("guest:")) return;

    const seatId = overId.replace("seat:", "");
    const guestId = activeId.replace("guest:", "");
    await handleSeatDrop(seatId, guestId, props.eventId);
  }

  async function undo() {
    startUndo(async () => {
      try {
        await api.post(`/v1/events/${props.eventId}/seating/undo`);
        // Refresh state — cara sederhana: reload
        location.reload();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    });
  }

  const assignedCount = props.initialAssignments.length;
  const totalSeats = props.initialSeats.length;

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="flex h-[calc(100vh-7rem)] gap-4">
        {/* Roster sidebar */}
        <RosterList />

        {/* Main canvas area */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between rounded-3xl border border-cockpit-10 bg-black/40 px-5 py-3 backdrop-blur-md">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Progress</p>
                <p className="mt-0.5 font-body text-sm tabular-nums text-white/80">
                  {assignedCount} / {totalSeats} kursi terisi
                </p>
              </div>
              <div className="h-6 w-px bg-cockpit-10" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Unassigned</p>
                <p className="mt-0.5 font-body text-sm tabular-nums text-white/80">
                  {guests.length} tamu
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={undo}
                className="rounded-full border border-cockpit-20 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-white/70 transition hover:bg-white/10"
              >
                ↶ Undo
              </button>
              <TableCreator eventId={props.eventId} />
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1">
            <SpatialCanvas eventId={props.eventId} />
          </div>
        </div>
      </div>
    </DndContext>
  );
}

// Suppress unused import warning for AssignmentWithDetails (used via store types)
export type { AssignmentWithDetails };