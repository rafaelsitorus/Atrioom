"use client";

import { useState } from "react";
import { ExcelImportModal } from "./ExcelImportModal";

export function ImportTrigger({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-cockpit-20 bg-white/5 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/10"
      >
        Import Excel
      </button>
      <ExcelImportModal eventId={eventId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}