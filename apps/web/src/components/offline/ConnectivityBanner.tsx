"use client";

// Banner tipis di atas — online / offline / syncing.
import { useConnectivity } from "@/modules/offline/useConnectivity";

export function ConnectivityBanner() {
  const { state } = useConnectivity();
  if (state === "online") return null;

  const config = {
    offline: {
      bg: "border-amber-400/30 bg-amber-400/10",
      dot: "bg-amber-400",
      label: "OFFLINE",
      msg: "Mode tanpa koneksi. Data lokal akan dikirim otomatis saat online.",
    },
    syncing: {
      bg: "border-sky-400/30 bg-sky-400/10",
      dot: "bg-sky-400 animate-pulse",
      label: "SYNCING",
      msg: "Mengirim data offline ke server…",
    },
  }[state === "offline" ? "offline" : "syncing"];

  return (
    <div className={`fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border backdrop-blur-md ${config.bg}`}>
      <div className="flex items-center gap-3 px-5 py-2">
        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/90">{config.label}</span>
        <span className="hidden text-xs text-white/60 md:inline">— {config.msg}</span>
      </div>
    </div>
  );
}