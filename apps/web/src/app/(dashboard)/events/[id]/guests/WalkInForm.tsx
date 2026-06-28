"use client";

import { useEffect, useState, useTransition } from "react";
import { addWalkInAction } from "./actions";

const CATEGORIES = ["VVIP", "VIP", "MEDIA", "REGULER", "STAFF"] as const;

export function WalkInForm({ eventId, open, onClose }: { eventId: string; open: boolean; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-emerald-400/80">Walk-In</p>
          <h2 className="font-heading text-3xl text-white">Tambah Tamu Walk-In</h2>
        </header>

        <form
          action={(fd) => {
            setError(null);
            start(async () => {
              try {
                await addWalkInAction(eventId, fd);
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Gagal menyimpan tamu.");
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          <Field name="fullName" label="Nama Lengkap" required />
          <div className="grid grid-cols-2 gap-3">
            <SelectField name="category" label="Kategori" options={[...CATEGORIES]} defaultValue="REGULER" />
            <Field name="plusOneCount" label="Plus-One" type="number" defaultValue="0" />
          </div>
          <Field name="email" label="Email (opsional)" type="email" />
          <Field name="phone" label="Telepon (opsional)" />
          <Field name="dietNotes" label="Catatan Diet/Alergi (opsional)" />

          {error && <p className="text-center text-xs text-red-400/90">{error}</p>}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-cockpit-20 px-5 py-3 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/5"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-full border border-cockpit-20 bg-white text-black px-5 py-3 text-xs uppercase tracking-[0.2em] transition hover:bg-white/90 disabled:opacity-50"
            >
              {pending ? "Menyimpan…" : "Tambah"}
            </button>
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
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        required={required}
        defaultValue={defaultValue}
        className="rounded-full border border-cockpit-10 bg-white/5 px-5 py-3 font-body text-base text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
      />
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-[10px] uppercase tracking-[0.3em] text-white/60">{label}</label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="rounded-full border border-cockpit-10 bg-white/5 px-5 py-3 font-body text-base text-white focus:border-white/40 focus:outline-none"
      >
        {options.map((o) => <option key={o} value={o} className="bg-black">{o}</option>)}
      </select>
    </div>
  );
}