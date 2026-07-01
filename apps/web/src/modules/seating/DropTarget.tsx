"use client";

// DropTarget — wrap seat untuk menerima drop dari RosterList.
// Pakai @dnd-kit useDroppable. Terintegrasi dengan Zustand untuk optimistic update + API call.
import { useDroppable } from "@dnd-kit/core";
import { useTransition } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useSeatingStore } from "./store";
import type { AssignmentWithDetails, GuestLite } from "@/lib/types-seating";

export function DropTarget({ seatId, occupied, children }: { seatId: string; occupied: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `seat:${seatId}`, disabled: occupied });
  const eventId = useSeatingStore((s) => s.eventId);
  const [pending, start] = useTransition();

  // Bind click → unassign jika occupied
  const onClick = (e: React.MouseEvent) => {
    if (!occupied || pending || !eventId) return;
    e.stopPropagation();
    start(async () => {
      try {
        await api.delete(`/v1/events/${eventId}/seats/${seatId}/assignment`);
        useSeatingStore.getState().optimisticUnassign(seatId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    });
  };

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`relative ${isOver ? "scale-110" : ""} transition-transform ${occupied ? "cursor-pointer" : ""}`}
      title={occupied ? "Klik untuk unassign" : "Drop tamu di sini"}
    >
      {children}
      {isOver && (
        <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-300" />
      )}
    </div>
  );
}

// Handler global yang dipanggil saat drag end.
// Dipasang di level page (DndContext.onDragEnd).
export async function handleSeatDrop(
  seatId: string,
  guestId: string,
  eventId: string,
): Promise<{ ok: boolean; error?: string }> {
  const store = useSeatingStore.getState();
  const guest = store.guests.find((g) => g.id === guestId);
  if (!guest) return { ok: false, error: "Tamu tidak ditemukan." };

  // Optimistic update dulu
  store.optimisticAssign(seatId, guest);
  store.markPending(`assign:${seatId}`, true);

  try {
    const a = await api.post<AssignmentWithDetails>(`/v1/events/${eventId}/assignments`, {
      seatId,
      guestId,
    });
    // Reconcile: replace optimistic row dengan row dari server
    store.reconcileAssignment(a);
    return { ok: true };
  } catch (err) {
    // Rollback: unassign lagi
    store.optimisticUnassign(seatId);
    if (err instanceof ApiError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Gagal menyimpan assignment." };
  } finally {
    store.markPending(`assign:${seatId}`, false);
  }
}