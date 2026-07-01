"use client";

import { useTransition } from "react";
import { deleteGuestAction } from "./actions";

export function GuestActions({ eventId, guestId }: { eventId: string; guestId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (confirm("Hapus tamu ini? Tindakan tidak dapat dibatalkan.")) {
          start(() => deleteGuestAction(eventId, guestId));
        }
      }}
      disabled={pending}
      className="rounded-full border border-cockpit-10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/40 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
    >
      {pending ? "…" : "Hapus"}
    </button>
  );
}