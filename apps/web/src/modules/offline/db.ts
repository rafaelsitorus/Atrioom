// Dexie schema untuk Offline-First cache (EPIC04).
// Database AtrioomDB — semua tabel persistent di IndexedDB.
import Dexie, { type Table } from "dexie";

// ─── Tipe cache (mirror types-checkin.ts & types-seating.ts) ────────────────────
export interface CachedEvent {
  id: string;
  name: string;
  venue: string | null;
  capacity: number | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  updated_at: string;
}

export interface CachedGuest {
  id: string;
  event_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  category: "VVIP" | "VIP" | "MEDIA" | "REGULER" | "STAFF";
  is_vip: boolean;
  qr_token: string;
  plus_one_count: number;
  diet_notes: string | null;
  checked_in_at: string | null;
  // Sync metadata
  _downloaded_at: number;
  _source: "EVENT_DOWNLOAD" | "GUEST_CACHE";
}

export interface CachedTable {
  id: string;
  event_id: string;
  label: string;
  capacity: number;
  pos_x: number;
  pos_y: number;
  shape: "ROUND" | "RECTANGULAR" | "LONG";
  _downloaded_at: number;
}

export interface CachedSeat {
  id: string;
  table_id: string;
  seat_label: string;
  pos_x: number;
  pos_y: number;
  _downloaded_at: number;
}

export interface CachedAssignment {
  id: string;
  event_id: string;
  seat_id: string;
  guest_id: string;
  assigned_at: string;
  _downloaded_at: number;
}

export interface SyncQueueItem {
  // Auto-incrementing primary key
  id?: number;
  // Logical identity — untuk idempotency
  op_id: string;
  op_type: "CHECK_IN" | "ASSIGN" | "UNASSIGN" | "WALK_IN";
  event_id: string;
  payload: Record<string, unknown>;
  created_at: number;
  attempts: number;
  last_error: string | null;
  status: "PENDING" | "IN_FLIGHT" | "APPLIED" | "REJECTED";
}

export interface EventReadiness {
  event_id: string;
  downloaded_at: number;
  guest_count: number;
  seat_count: number;
  assignment_count: number;
  ready: boolean;
}

class AtrioomDB extends Dexie {
  events!: Table<CachedEvent, string>;
  guests!: Table<CachedGuest, string>;
  tableList!: Table<CachedTable, string>;
  seatList!: Table<CachedSeat, string>;
  assignments!: Table<CachedAssignment, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  readiness!: Table<EventReadiness, string>;

  constructor() {
    super("atrioom");
    this.version(1).stores({
      events:       "id, status, starts_at",
      guests:       "id, event_id, category, qr_token, full_name, checked_in_at, [event_id+row_version]",
      tableList:    "id, event_id",
      seatList:     "id, table_id",
      assignments:  "id, event_id, seat_id, guest_id",
      syncQueue:    "++id, op_id, status, op_type, event_id, created_at",
      readiness:    "event_id, downloaded_at",
    });
  }
}

// Lazy singleton — di-skip saat SSR (IndexedDB undefined di server)
let _dbInstance: AtrioomDB | null = null;
export function getDb(): AtrioomDB {
  if (typeof window === "undefined") {
    throw new Error("getDb() called on server — IndexedDB unavailable.");
  }
  if (!_dbInstance) _dbInstance = new AtrioomDB();
  return _dbInstance;
}

export type { SyncQueueItem as SyncQueueOp };