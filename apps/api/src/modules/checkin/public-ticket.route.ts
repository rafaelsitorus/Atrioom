// Public ticket lookup — no auth, used by /ticket/[token] page.
// Dipasang terpisah dari checkinRoutes (yang butuh auth).
import type { FastifyPluginAsync } from "fastify";
import { getSupabaseAdmin } from "../../config/supabase";
import { NotFoundError } from "../../shared/errors";

export const publicTicketRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/v1/public/ticket/:token", async (request) => {
    const { token } = request.params as { token: string };
    if (!token || token.length < 8) throw new NotFoundError("Tiket tidak ditemukan.");

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("guests")
      .select("id, full_name, category, is_vip, qr_token, event_id, events!inner(name, starts_at, venue)")
      .eq("qr_token", token)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) throw new NotFoundError("Tiket tidak ditemukan.");
    return data;
  });
};

export default publicTicketRoutes;