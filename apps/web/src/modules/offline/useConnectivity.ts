"use client";

// Hook: pantau online/offline + status sync.
import { useEffect, useState } from "react";

export type ConnectionState = "online" | "offline" | "syncing";

export function useConnectivity() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onSyncStart = () => setSyncing(true);
    const onSyncEnd = () => setSyncing(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("atrioom:sync-start", onSyncStart as EventListener);
    window.addEventListener("atrioom:sync-end", onSyncEnd as EventListener);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("atrioom:sync-start", onSyncStart as EventListener);
      window.removeEventListener("atrioom:sync-end", onSyncEnd as EventListener);
    };
  }, []);

  const state: ConnectionState = syncing ? "syncing" : online ? "online" : "offline";
  return { online, syncing, state };
}