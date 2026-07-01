"use client";

// Client-side SW registration + listen to messages from SW.
import { useEffect, useState } from "react";

export function SwRegister() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("SW registration failed:", err);
    });

    // Listen sync-trigger dari SW
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "SYNC_TRIGGER") {
        window.dispatchEvent(new CustomEvent("atrioom:trigger-sync"));
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    // Capture install prompt untuk tombol "Install App" nanti
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  // Expose install prompt ke UI lain (PwaInstallButton) via window
  useEffect(() => {
    if (installPromptEvent) {
      (window as unknown as { __atrioomInstallPrompt: BeforeInstallPromptEvent }).__atrioomInstallPrompt = installPromptEvent;
    }
  }, [installPromptEvent]);

  return null;
}

// Minimal type spec untuk event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}