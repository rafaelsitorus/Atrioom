// Fastify app factory — terpisah dari server.ts agar testable.
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { env, allowedOrigins } from "./config/env";
import authPlugin from "./plugins/auth.plugin";
import errorPlugin from "./plugins/error.plugin";
import authRoutes from "./modules/auth/auth.routes";

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

  // Plugins
  await app.register(errorPlugin);
  await app.register(authPlugin);

  // Routes
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));
  await app.register(authRoutes);

  return app;
}