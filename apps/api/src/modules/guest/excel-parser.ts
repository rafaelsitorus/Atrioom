// Excel parser & validator — membaca buffer .xlsx, memetakan kolom,
// memvalidasi baris, dan mendeteksi duplikat.
import ExcelJS from "exceljs";
import { randomBytes } from "node:crypto";
import type { GuestCategory } from "./guest.types.js";

export interface ColumnMapping {
  fullName: string;      // header text dari Excel
  category?: string;
  email?: string;
  phone?: string;
  plusOneCount?: string;
  dietNotes?: string;
  notes?: string;
}

export interface ParsedRow {
  rowNumber: number;
  full_name: string;
  email?: string;
  phone?: string;
  category: GuestCategory;
  plus_one_count: number;
  diet_notes?: string;
  notes?: string;
  errors: string[];
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  valid: ParsedRow[];
  invalid: ParsedRow[];
}

const VALID_CATEGORIES: GuestCategory[] = ["VVIP", "VIP", "MEDIA", "REGULER", "STAFF"];

function normalizeCategory(v: unknown): GuestCategory {
  const s = String(v ?? "").trim().toUpperCase();
  if ((VALID_CATEGORIES as string[]).includes(s)) return s as GuestCategory;
  return "REGULER";
}

function normalizeInt(v: unknown): number {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(10, Math.floor(n));
}

export async function parseXlsx(
  buffer: Buffer,
  mapping: ColumnMapping,
): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  // Convert ke ArrayBuffer untuk kompatibilitas ExcelJS typings
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  await workbook.xlsx.load(ab);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("File Excel kosong atau sheet pertama tidak ditemukan.");

  // Row 1: headers
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  // Map header → column index
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => { if (h) idx[h] = i; });

  function findCol(name?: string): number | undefined {
    if (!name) return undefined;
    return idx[name];
  }

  const cols = {
    fullName: findCol(mapping.fullName),
    category: findCol(mapping.category),
    email: findCol(mapping.email),
    phone: findCol(mapping.phone),
    plusOneCount: findCol(mapping.plusOneCount),
    dietNotes: findCol(mapping.dietNotes),
    notes: findCol(mapping.notes),
  };

  if (cols.fullName === undefined) {
    throw new Error(`Kolom nama ("${mapping.fullName}") tidak ditemukan di header Excel.`);
  }

  const rows: ParsedRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (colIdx: number | undefined) =>
      colIdx === undefined ? "" : row.getCell(colIdx + 1).value;

    const fullName = String(get(cols.fullName) ?? "").trim();
    const errors: string[] = [];
    if (!fullName) errors.push("Nama kosong");

    rows.push({
      rowNumber,
      full_name: fullName,
      email: String(get(cols.email) ?? "").trim() || undefined,
      phone: String(get(cols.phone) ?? "").trim() || undefined,
      category: normalizeCategory(get(cols.category)),
      plus_one_count: normalizeInt(get(cols.plusOneCount)),
      diet_notes: String(get(cols.dietNotes) ?? "").trim() || undefined,
      notes: String(get(cols.notes) ?? "").trim() || undefined,
      errors,
    });
  });

  const valid: ParsedRow[] = [];
  const invalid: ParsedRow[] = [];
  // Dedupe by full_name (case-insensitive) di dalam satu file
  const seen = new Set<string>();
  for (const r of rows) {
    const key = r.full_name.toLowerCase();
    if (seen.has(key)) {
      r.errors.push(`Duplikat dalam file (${key})`);
    } else {
      seen.add(key);
    }
    if (r.errors.length === 0) valid.push(r);
    else invalid.push(r);
  }

  return { headers, rows, valid, invalid };
}

/** Generate token QR acak 32-char hex (16 byte). */
export function generateQrToken(): string {
  return randomBytes(16).toString("hex");
}