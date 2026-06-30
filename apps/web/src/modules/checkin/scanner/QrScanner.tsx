"use client";

// QR Scanner — pakai @zxing/browser.
// Punya track multi-camera, throttle result untuk cegah duplicate rapid scan.
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

export interface ScanResult {
  text: string;
}

interface Props {
  onResult: (r: ScanResult) => void;
  paused?: boolean;
}

export function QrScanner({ onResult, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastResultRef = useRef<{ text: string; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (paused) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }
    const reader = new BrowserMultiFormatReader();
    let mounted = true;

    (async () => {
      try {
        if (!videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(
          undefined, // default camera (environment on mobile)
          videoRef.current,
          (result, err) => {
            if (!mounted) return;
            if (result) {
              const text = result.getText();
              const now = Date.now();
              // Throttle: ignore same result dalam 1.5s (anti-repeat)
              if (
                lastResultRef.current &&
                lastResultRef.current.text === text &&
                now - lastResultRef.current.at < 1500
              ) {
                return;
              }
              lastResultRef.current = { text, at: now };
              onResult({ text });
            }
            if (err && err.name !== "NotFoundException") {
              // NotFoundException normal (no QR in frame)
            }
          },
        );
        controlsRef.current = controls;
        setCameraReady(true);
      } catch (e) {
        setError(
          e instanceof Error
            ? `Kamera tidak dapat diakses: ${e.message}`
            : "Kamera tidak dapat diakses.",
        );
      }
    })();

    return () => {
      mounted = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [paused, onResult]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-cockpit-10 bg-black">
      {/* Video feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        autoPlay
      />

      {/* Aerospace viewfinder overlay */}
      <div className="pointer-events-none absolute inset-0">
        {/* Corner brackets */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <g stroke="white" strokeWidth="0.5" fill="none">
            {/* Top-left */}
            <polyline points="2,12 2,2 12,2" />
            {/* Top-right */}
            <polyline points="88,2 98,2 98,12" />
            {/* Bottom-left */}
            <polyline points="2,88 2,98 12,98" />
            {/* Bottom-right */}
            <polyline points="88,98 98,98 98,88" />
          </g>
          {/* Center crosshair */}
          <line x1="50" y1="48" x2="50" y2="52" stroke="white" strokeWidth="0.3" />
          <line x1="48" y1="50" x2="52" y2="50" stroke="white" strokeWidth="0.3" />
        </svg>

        {/* Center reticle box */}
        <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/30 shadow-[0_0_24px_rgba(255,255,255,0.08)]" />

        {/* Top HUD label */}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/30 bg-black/60 px-3 py-1.5 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-body text-[10px] uppercase tracking-[0.3em] text-white/80">
            {cameraReady ? "Scanner Active" : "Initializing…"}
          </span>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white/60 backdrop-blur-md">
          Align QR within frame
        </div>
      </div>

      {error && (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-2xl border border-red-400/40 bg-red-950/80 p-4 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-red-300">{error}</p>
          <p className="mt-2 text-xs text-white/60">
            Gunakan Manual Search di bawah.
          </p>
        </div>
      )}
    </div>
  );
}