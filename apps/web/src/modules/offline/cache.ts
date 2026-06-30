// Cache helpers — bulk save/clear per event.
"use client";

import { getDb, type CachedEvent, type CachedGuest, type CachedTable, type CachedSeat, type CachedAssignment, type EventReadiness } from "./db";

export const cacheRepo = {
  async saveEvent(ev: CachedEvent) {
    const db = getDb();
    await db.events.put({ ...ev, updated_at: ev.updated_at ?? new Date().toISOString() });
  },

  async saveGuestsBulk(guests: CachedGuest[]) {
    if (guests.length === 0) return;
    const db = getDb();
    await db.guests.bulkPut(guests);
  },

  async saveTablesBulk(tables: CachedTable[]) {
    if (tables.length === 0) return;
    const db = getDb();
    await db.tableList.bulkPut(tables);
  },

  async saveSeatsBulk(seats: CachedSeat[]) {
    if (seats.length === 0) return;
    const db = getDb();
    await db.seatList.bulkPut(seats);
  },

  async saveAssignmentsBulk(assignments: CachedAssignment[]) {
    if (assignments.length === 0) return;
    const db = getDb();
    await db.assignments.bulkPut(assignments);
  },

  async clearEvent(eventId: string) {
    const db = getDb();
    await db.transaction("rw", [db.events, db.guests, db.tableList, db.seatList, db.assignments, db.readiness], async () => {
      await db.events.where({ id: eventId }).delete();
      await db.guests.where({ event_id: eventId }).delete();
      await db.tableList.where({ event_id: eventId }).delete();
      await db.assignments.where({ event_id: eventId }).delete();
      await db.seatList.toCollection().delete();
      await db.readiness.delete(eventId);
    });
  },

  async setReadiness(r: EventReadiness) {
    const db = getDb();
    await db.readiness.put(r);
  },

  async getReadiness(eventId: string): Promise<EventReadiness | undefined> {
    const db = getDb();
    return db.readiness.get(eventId);
  },

  async searchGuests(eventId: string, q: string, limit = 50) {
    const db = getDb();
    if (!q.trim()) return db.guests.where({ event_id: eventId }).limit(limit).toArray();
    const term = q.toLowerCase();
    const all = await db.guests.where({ event_id: eventId }).toArray();
    return all
      .filter((g) => g.full_name.toLowerCase().includes(term) || (g.qr_token ?? "").includes(q.trim()))
      .slice(0, limit);
  },

  async findGuestByQr(eventId: string, qrToken: string) {
    const db = getDb();
    return db.guests.where({ event_id: eventId, qr_token: qrToken }).first();
  },

  async updateGuestCheckedIn(guestId: string, checkedInAt: string) {
    const db = getDb();
    await db.guests.update(guestId, { checked_in_at: checkedInAt });
  },

  async listSeatsByEvent(eventId: string): Promise<CachedSeat[]> {
    const db = getDb();
    const tables = await db.tableList.where({ event_id: eventId }).toArray();
    const tableIds = new Set(tables.map((t) => t.id));
    const allSeats = await db.seatList.toArray();
    return allSeats.filter((s) => tableIds.has(s.table_id));
  },
};