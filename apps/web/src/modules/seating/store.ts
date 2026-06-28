"use client";

// Zustand store untuk Seating module.
// Dirancang agar state-nya bisa di-persist ke IndexedDB di EPIC04 tanpa refactor besar.
// Pattern: actions terpisah dari selectors; immer-friendly (nested mutations OK).
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { TableRow, SeatRow, AssignmentWithDetails, GuestLite } from "@/lib/types-seating";

interface SeatingState {
  eventId: string | null;
  tables: TableRow[];
  seats: SeatRow[];
  assignments: AssignmentWithDetails[];
  guests: GuestLite[];
  search: string;
  selectedTableId: string | null;
  // Optimistic update: pending assignment (sedang dalam flight)
  pending: Record<string, true>;

  // Setters (dipakai saat initial fetch dari server)
  hydrate: (data: {
    eventId: string;
    tables: TableRow[];
    seats: SeatRow[];
    assignments: AssignmentWithDetails[];
    guests: GuestLite[];
  }) => void;
  setSearch: (q: string) => void;
  selectTable: (id: string | null) => void;

  // Mutations (optimistic, lalu di-reconcile dengan response server)
  optimisticAssign: (seatId: string, guest: GuestLite) => void;
  optimisticUnassign: (seatId: string) => void;
  reconcileAssignment: (a: AssignmentWithDetails) => void;
  removeAssignment: (seatId: string) => void;
  markPending: (key: string, on: boolean) => void;
}

export const useSeatingStore = create<SeatingState>()(
  subscribeWithSelector((set) => ({
    eventId: null,
    tables: [],
    seats: [],
    assignments: [],
    guests: [],
    search: "",
    selectedTableId: null,
    pending: {},

    hydrate: (data) => set({
      eventId: data.eventId,
      tables: data.tables,
      seats: data.seats,
      assignments: data.assignments,
      guests: data.guests,
    }),

    setSearch: (q) => set({ search: q }),
    selectTable: (id) => set({ selectedTableId: id }),

    optimisticAssign: (seatId, guest) =>
      set((s) => {
        const seat = s.seats.find((x) => x.id === seatId);
        if (!seat) return s;
        const table = s.tables.find((t) => t.id === seat.table_id);
        // Hapus assignment lain untuk guest ini (move case)
        const others = s.assignments.filter((a) => a.guest_id !== guest.id);
        return {
          assignments: [
            ...others,
            {
              id: `optimistic-${seatId}-${guest.id}`,
              event_id: s.eventId!,
              seat_id: seatId,
              guest_id: guest.id,
              guest_name: guest.full_name,
              guest_category: guest.category,
              is_vip: guest.is_vip,
              seat_label: seat.seat_label,
              table_label: table?.label ?? "",
              assigned_at: new Date().toISOString(),
            },
          ],
          guests: s.guests.filter((g) => g.id !== guest.id),
        };
      }),

    optimisticUnassign: (seatId) =>
      set((s) => {
        const a = s.assignments.find((x) => x.seat_id === seatId);
        if (!a) return s;
        return {
          assignments: s.assignments.filter((x) => x.seat_id !== seatId),
          guests: [
            ...s.guests,
            {
              id: a.guest_id,
              full_name: a.guest_name,
              category: a.guest_category,
              is_vip: a.is_vip,
              email: null,
              phone: null,
              plus_one_count: 0,
            },
          ],
        };
      }),

    reconcileAssignment: (a) =>
      set((s) => {
        const filtered = s.assignments.filter((x) => x.seat_id !== a.seat_id);
        return {
          assignments: [...filtered, a],
          pending: Object.fromEntries(
            Object.entries(s.pending).filter(([k]) => !k.includes(a.seat_id)),
          ),
        };
      }),

    removeAssignment: (seatId) =>
      set((s) => ({
        assignments: s.assignments.filter((x) => x.seat_id !== seatId),
        pending: Object.fromEntries(
          Object.entries(s.pending).filter(([k]) => !k.includes(seatId)),
        ),
      })),

    markPending: (key, on) =>
      set((s) => {
        const next = { ...s.pending };
        if (on) next[key] = true;
        else delete next[key];
        return { pending: next };
      }),
  })),
);

// Selector: tamu yang belum punya kursi
export const useUnassignedGuests = () =>
  useSeatingStore((s) => {
    if (!s.search) return s.guests;
    const q = s.search.toLowerCase();
    return s.guests.filter((g) => g.full_name.toLowerCase().includes(q));
  });

// Selector: assignment per seat (untuk highlight)
export const useAssignmentBySeat = (seatId: string) =>
  useSeatingStore((s) => s.assignments.find((a) => a.seat_id === seatId));