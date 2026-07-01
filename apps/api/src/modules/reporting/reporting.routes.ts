// Routes Reporting — semua butuh auth.
import "../../types/fastify";
import type { FastifyPluginAsync } from "fastify";
import { reportingService } from "./reporting.service";

export const reportingRoutes: FastifyPluginAsync = async (fastify) => {
  // Dashboard stats agregat
  fastify.get(
    "/v1/events/:eventId/reports/dashboard",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { eventId } = request.params as { eventId: string };
      return reportingService.getDashboard(eventId);
    },
  );

  // Event summary ringkas (untuk header card)
  fastify.get(
    "/v1/events/:eventId/reports/summary",
    { preHandler: fastify.requireAuth },
    async (request) => {
      const { eventId } = request.params as { eventId: string };
      return reportingService.getEventSummary(eventId);
    },
  );

  // Excel export — return sebagai binary
  fastify.get(
    "/v1/events/:eventId/reports/export",
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string };
      const buf = await reportingService.exportAttendanceExcel(eventId);
      reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      reply.header("Content-Disposition", `attachment; filename="atrioom-attendance-${eventId}-${Date.now()}.xlsx"`);
      return reply.send(buf);
    },
  );
};

export default reportingRoutes;