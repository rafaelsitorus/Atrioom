// Offline manifest endpoint — mengembalikan snapshot event untuk IndexedDB.
// Dipanggil saat Front Desk tekan "Download Event".
import type { FastifyPluginAsync } from "fastify";
import { getSupabaseAdmin } from "../../config/supabase";

export const offlineRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/v1/events/:eventId/manifest",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { eventId } = request.params as { eventId: string };
      const admin = getSupabaseAdmin();

      // Event + guests + tables + seats + assignments, semua paralel
      const [eventRes, guestsRes, tablesRes, seatsRes, assignmentsRes] = await Promise.all([
        admin.from("events").select("*").eq("id", eventId).is("deleted_at", null).maybeSingle(),
        admin.from("guests").select("*").eq("event_id", eventId).is("deleted_at", null),
        admin.from("tables").select("*").eq("event_id", eventId).is("deleted_at", null),
        admin.from("seats").select("*, tables!inner(event_id)").eq("tables.event_id", eventId).is("deleted_at", null),
        admin.from("seat_assignments").select("id, event_id, seat_id, guest_id, assigned_at").eq("event_id", eventId).is("deleted_at", null),
      ]);

      if (eventRes.error || !eventRes.data) return { event: null, guests: [], tables: [], seats: [], assignments: [] };

      // Flatten seats (drop tables join)
      const seatsFlat = (seatsRes.data ?? []).map((r: Record<string, unknown>) => {
        const { tables: _t, ...s } = r;
        return s;
      });

      return {
        event: eventRes.data,
        guests: guestsRes.data ?? [],
        tables: tablesRes.data ?? [],
        seats: seatsFlat,
        assignments: assignmentsRes.data ?? [],
        fetched_at: new Date().toISOString(),
      };
    },
  );
};

export default offlineRoutes;