// Fastify app factory — terpisah dari server.ts agar testable.
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import { env, allowedOrigins } from "./config/env";
import authPlugin from "./plugins/auth.plugin";
import errorPlugin from "./plugins/error.plugin";
import authRoutes from "./modules/auth/auth.routes";
import eventRoutes from "./modules/event/event.routes";
import guestRoutes from "./modules/guest/guest.routes";
import seatingRoutes from "./modules/seating/seating.routes";
import checkinRoutes from "./modules/checkin/checkin.routes";
import publicTicketRoutes from "./modules/checkin/public-ticket.route";

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

  return app;
}