"use client";

import { useTransition } from "react";
import { archiveEventAction } from "./actions";

export function EventArchiveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => archiveEventAction(id))}
      disabled={pending}
      className="rounded-full border border-cockpit-10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/40 transition hover:border-white/30 hover:text-white disabled:opacity-50"
    >
      {pending ? "…" : "Archive"}
    </button>
  );
}