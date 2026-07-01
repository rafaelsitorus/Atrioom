"use client";

// TableCreator — popover kecil untuk menambah meja & generate kursi.
import { useState, useTransition } from "react";
import { api } from "@/lib/api-client";
import { useSeatingStore } from "./store";

export function TableCreator({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [shape, setShape] = useState<"ROUND" | "RECTANGULAR" | "LONG">("ROUND");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!label.trim()) { setError("Label meja wajib."); return; }
    start(async () => {
      try {
        const table = await api.post<{ id: string }>(`/v1/events/${eventId}/tables`, {
          label: label.trim(),
          capacity,
          shape,
        });
        await api.post(`/v1/tables/${table.id}/seats/generate`, { count: capacity });
        // Refresh dari server (page-level)
        location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal membuat meja.");
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-cockpit-20 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/10"
      >
        + Tambah Meja
      </button>
      {open && (
        <div className="heavy-frosted-glass absolute right-0 top-12 z-20 w-72 rounded-3xl p-5">
          <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/40">Meja Baru</p>
          <div className="flex flex-col gap-3">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (mis. T1)"
              className="rounded-full border border-cockpit-10 bg-white/5 px-4 py-2 font-body text-sm text-white focus:border-white/40 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, Math.min(50, Number(e.target.value))))}
                className="rounded-full border border-cockpit-10 bg-white/5 px-4 py-2 font-body text-sm text-white focus:outline-none"
              />
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as typeof shape)}
                className="rounded-full border border-cockpit-10 bg-white/5 px-4 py-2 font-body text-sm text-white focus:outline-none"
              >
                <option value="ROUND" className="bg-black">Round</option>
                <option value="RECTANGULAR" className="bg-black">Rectangular</option>
                <option value="LONG" className="bg-black">Long</option>
              </select>
            </div>
            {error && <p className="text-xs text-red-400/90">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-cockpit-10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/60"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={pending}
                className="flex-1 rounded-full border border-cockpit-20 bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] text-black disabled:opacity-50"
              >
                {pending ? "…" : "Buat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}