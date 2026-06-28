"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import ExcelJS from "exceljs";
import { api, ApiError } from "@/lib/api-client";

type Step = "upload" | "mapping" | "result";

interface ColumnMapping {
  fullName: string;
  category?: string;
  email?: string;
  phone?: string;
  plusOneCount?: string;
  dietNotes?: string;
  notes?: string;
}

const TARGET_FIELDS = [
  { key: "fullName",     label: "Nama Lengkap", required: true },
  { key: "category",     label: "Kategori",     required: false },
  { key: "email",        label: "Email",        required: false },
  { key: "phone",        label: "Telepon",      required: false },
  { key: "plusOneCount", label: "Jumlah Plus-One", required: false },
  { key: "dietNotes",    label: "Diet / Alergi", required: false },
  { key: "notes",        label: "Catatan",      required: false },
] as const;

type TargetKey = (typeof TARGET_FIELDS)[number]["key"];

export function ExcelImportModal({
  eventId,
  open,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [preview, setPreview] = useState<string[][]>([]);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      // Reset on close
      setStep("upload");
      setFile(null);
      setHeaders([]);
      setMapping({});
      setPreview([]);
      setResult(null);
      setError(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function readFileHeaders(f: File) {
    const buf = await f.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const sheet = wb.worksheets[0];
    if (!sheet) throw new Error("Sheet kosong.");
    const headerRow = sheet.getRow(1);
    const hdrs: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
      hdrs[col - 1] = String(cell.value ?? "").trim();
    });
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rn) => {
      if (rn === 1 || rn > 6) return; // preview 5 baris
      const r: string[] = [];
      hdrs.forEach((_, i) => {
        r.push(String(row.getCell(i + 1).value ?? "").trim());
      });
      rows.push(r);
    });
    return { headers: hdrs.filter(Boolean), preview: rows };
  }

  async function handleFile(f: File) {
    setError(null);
    if (!/\.xlsx$|\.xls$/i.test(f.name)) {
      setError("File harus berformat .xlsx atau .xls");
      return;
    }
    setFile(f);
    try {
      const { headers: h, preview: p } = await readFileHeaders(f);
      setHeaders(h);
      setPreview(p);
      // Auto-guess: cocokkan header dengan key TargetFields (case-insensitive)
      const auto: Partial<ColumnMapping> = {};
      TARGET_FIELDS.forEach((tf) => {
        const match = h.find((x) => x.toLowerCase().includes(tf.key.toLowerCase())
          || (tf.key === "fullName" && /nama|name/i.test(x))
          || (tf.key === "plusOneCount" && /plus|pendamping/i.test(x))
          || (tf.key === "dietNotes" && /diet|alergi|alergy/i.test(x))
        );
        if (match) auto[tf.key] = match;
      });
      setMapping(auto);
      setStep("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membaca file.");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function submitImport() {
    if (!file || !mapping.fullName) {
      setError("Pilih kolom untuk Nama Lengkap (wajib).");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mapping", JSON.stringify(mapping));
    start(async () => {
      try {
        const res = await api.postForm<{ inserted: number; skipped: number }>(
          `/v1/events/${eventId}/guests/import`,
          fd,
        );
        setResult(res);
        setStep("result");
      } catch (e) {
        if (e instanceof ApiError) setError(e.message);
        else setError(e instanceof Error ? e.message : "Gagal import.");
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6 py-10"
      onClick={onClose}
    >
      <div
        className="heavy-frosted-glass relative w-full max-w-3xl rounded-3xl px-10 py-10"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-white/40">Step {step === "upload" ? "1" : step === "mapping" ? "2" : "3"} / 3</p>
            <h2 className="font-heading text-3xl text-white">Import Manifest Tamu</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-cockpit-10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/40 hover:text-white"
          >
            Tutup
          </button>
        </header>

        {error && (
          <p className="mb-4 rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2 text-center text-xs text-red-300">
            {error}
          </p>
        )}

        {step === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition ${
              dragging ? "border-white/50 bg-white/5" : "border-cockpit-10 bg-white/[0.02]"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="mb-4 text-4xl text-white/30">↑</div>
            <p className="font-heading text-2xl text-white">Drop file .xlsx di sini</p>
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">
              atau klik untuk pilih file · maks 10 MB
            </p>
          </div>
        )}

        {step === "mapping" && (
          <div className="flex flex-col gap-6">
            {/* Preview tabel kecil */}
            <div className="rounded-2xl border border-cockpit-10 bg-black/40 p-4">
              <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/40">Preview (5 baris pertama)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-cockpit-10">
                      {headers.map((h, i) => (
                        <th key={i} className="px-2 py-1 text-left font-body text-white/60">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, ri) => (
                      <tr key={ri} className="border-b border-cockpit-10/50">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1 text-white/70">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mapping form */}
            <div className="grid grid-cols-2 gap-3">
              {TARGET_FIELDS.map((tf) => (
                <div key={tf.key} className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-[0.3em] text-white/60">
                    {tf.label}{tf.required ? " *" : ""}
                  </label>
                  <select
                    value={(mapping[tf.key as TargetKey] as string) ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [tf.key]: e.target.value || undefined }))
                    }
                    className="rounded-full border border-cockpit-10 bg-white/5 px-4 py-2 font-body text-sm text-white focus:border-white/40 focus:outline-none"
                  >
                    <option value="" className="bg-black">— Tidak dipakai —</option>
                    {headers.map((h) => (
                      <option key={h} value={h} className="bg-black">{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-3">
              <button
                onClick={() => { setStep("upload"); setFile(null); }}
                className="rounded-full border border-cockpit-20 px-5 py-3 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/5"
              >
                ← Kembali
              </button>
              <button
                onClick={submitImport}
                disabled={pending || !mapping.fullName}
                className="flex-1 rounded-full border border-cockpit-20 bg-white text-black px-5 py-3 text-xs uppercase tracking-[0.2em] transition hover:bg-white/90 disabled:opacity-50"
              >
                {pending ? "Mengimpor…" : `Import ${file?.name}`}
              </button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            <div className="font-heading text-7xl text-white">{result.inserted}</div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Tamu berhasil diimpor</p>
            {result.skipped > 0 && (
              <p className="text-xs text-white/40">{result.skipped} baris dilewati (duplikat / invalid)</p>
            )}
            <button
              onClick={onClose}
              className="rounded-full border border-cockpit-20 bg-white text-black px-6 py-3 text-xs uppercase tracking-[0.2em]"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
}