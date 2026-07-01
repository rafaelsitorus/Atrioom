"use client";

import { useState } from "react";
import { CreateEventModal } from "./CreateEventModal";

export function CreateEventButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-cockpit-20 bg-white px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-black transition hover:bg-white/90"
      >
        + Event Baru
      </button>
      <CreateEventModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}