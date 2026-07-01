"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createEventAction, type CreateEventState } from "./actions";

const initialState: CreateEventState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full border border-cockpit-20 bg-white text-black px-5 py-3 text-sm uppercase tracking-[0.2em] transition hover:bg-white/90 disabled:opacity-50"
    >
      {pending ? "Membuat…" : "Buat Event"}
    </button>
  );
}

export function CreateEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action] = useFormState(createEventAction, initialState);

  // ESC untuk tutup modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <div
        className="heavy-frosted-glass relative w-full max-w-lg rounded-3xl px-10 py-10"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-white/40">New Event</p>
          <h2 className="font-heading text-3xl text-white">Event Baru</h2>
        </header>

        <form action={action} className="flex flex-col gap-5">
          <Field name="name" label="Nama Event" placeholder="Annual Gala 2026" error={state.fieldErrors?.name} required />

          <Field name="venue" label="Venue" placeholder="The Ritz-Carlton Grand Ballroom" error={state.fieldErrors?.venue} />

          <div className="grid grid-cols-2 gap-4">
            <Field
              name="capacity"
              label="Kapasitas"
              type="number"
              placeholder="500"
              error={state.fieldErrors?.capacity}
            />
            <Field
              name="startsAt"
              label="Mulai"
              type="datetime-local"
              error={state.fieldErrors?.startsAt}
              required
            />
          </div>

          <Field name="endsAt" label="Selesai (opsional)" type="datetime-local" error={state.fieldErrors?.endsAt} />

          {state.error && (
            <p className="text-center text-xs uppercase tracking-[0.2em] text-red-400/90">{state.error}</p>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-cockpit-20 px-5 py-3 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/5"
            >
              Batal
            </button>
            <div className="flex-1">
              <SubmitButton />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  error,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-[10px] uppercase tracking-[0.3em] text-white/60">
        {label}{required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="rounded-full border border-cockpit-10 bg-white/5 px-5 py-3 font-body text-base text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
      />
      {error && <p className="text-xs text-red-400/90">{error}</p>}
    </div>
  );
}