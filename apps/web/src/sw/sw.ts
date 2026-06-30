/// <reference lib="webworker" />
// Service Worker Atrioom — runtime caching + offline fallback.
import { defaultCache as _defaultCache } from "@serwist/next/worker";
import { Serwist, CacheFirst, NetworkFirst, ExpirationPlugin } from "serwist";
void _defaultCache; // imported to ensure type augmentation registered
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

const serwistInstance = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"),
      handler: new CacheFirst({
        cacheName: "atrioom-static",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/v1/") || url.pathname.startsWith("/rest/"),
      handler: new NetworkFirst({
        cacheName: "atrioom-api",
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ request }) => request.destination === "document",
      handler: new NetworkFirst({
        cacheName: "atrioom-pages",
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// Background Sync handler — SW tell client untuk trigger replay
self.addEventListener("sync", (event: Event) => {
  const e = event as ExtendableEvent & { tag?: string; waitUntil: (p: Promise<unknown>) => void };
  if (e.tag === "atrioom-sync-checkins") {
    e.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: "SYNC_TRIGGER", tag: "atrioom-sync-checkins" });
  }
}

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

void serwistInstance;