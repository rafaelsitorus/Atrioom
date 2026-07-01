"use client";

import { useState } from "react";
import { WalkInForm } from "./WalkInForm";

export function WalkInButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-emerald-300 transition hover:bg-emerald-400/20"
      >
        + Walk-In
      </button>
      <WalkInForm eventId={eventId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}