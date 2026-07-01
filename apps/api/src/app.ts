// Fastify app factory — terpisah dari server.ts agar testable.
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import { env, allowedOrigins } from "./config/env.js";
import authPlugin from "./plugins/auth.plugin.js";
import errorPlugin from "./plugins/error.plugin.js";
import authRoutes from "./modules/auth/auth.routes.js";
import eventRoutes from "./modules/event/event.routes.js";
import guestRoutes from "./modules/guest/guest.routes.js";
import seatingRoutes from "./modules/seating/seating.routes.js";
import checkinRoutes from "./modules/checkin/checkin.routes.js";
import publicTicketRoutes from "./modules/checkin/public-ticket.route.js";
import offlineRoutes from "./modules/offline/offline.routes.js";
import reportingRoutes from "./modules/reporting/reporting.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss.l", ignore: "pid,hostname" } }
          : undefined,
    },
  });

  // Security headers
  await app.register(helmet, { contentSecurityPolicy: false });

  // CORS — izinkan web (Next.js) mengakses API
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (allowedOrigins.length === 0) return cb(null, true); // dev: allow all
      cb(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  });

  // Multipart — untuk upload Excel (EPIC01)
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  // Plugins
  await app.register(errorPlugin);
  await app.register(authPlugin);

  // Routes
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));
  await app.register(authRoutes);
  await app.register(eventRoutes);
  await app.register(guestRoutes);
  await app.register(seatingRoutes);
  await app.register(checkinRoutes);
  await app.register(publicTicketRoutes);
  await app.register(offlineRoutes);
  await app.register(reportingRoutes);

  return app;
}