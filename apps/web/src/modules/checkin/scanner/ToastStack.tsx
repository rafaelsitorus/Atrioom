"use client";

// ToastStack — bottom-right stack of subtle aerospace notifications.
export type ToastKind = "success" | "duplicate" | "walkin" | "error";
export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  message: string;
  ts: number;
}

const STYLE: Record<ToastKind, string> = {
  success:   "border-emerald-400/40 bg-emerald-400/5",
  duplicate: "border-red-900/70 bg-red-950/30",
  walkin:    "border-amber-400/50 bg-amber-400/10",
  error:     "border-white/20 bg-white/5",
};

const ACCENT: Record<ToastKind, string> = {
  success:   "text-emerald-300",
  duplicate: "text-red-300",
  walkin:    "text-amber-300",
  error:     "text-white/60",
};

export function ToastStack({
  toasts, onDismiss,
}: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto cursor-pointer rounded-2xl border ${STYLE[t.kind]} heavy-frosted-glass px-4 py-3 transition hover:scale-[1.02]`}
          role="status"
        >
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[10px] uppercase tracking-[0.3em] ${ACCENT[t.kind]}`}>
              {t.kind === "success" ? "Confirmed" :
               t.kind === "duplicate" ? "Duplicate" :
               t.kind === "walkin" ? "Walk-In" : "Error"}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(t.id); }}
              className="text-xs text-white/40 hover:text-white"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          <p className="mt-1 font-body text-sm text-white">{t.title}</p>
          <p className="mt-0.5 text-xs text-white/50">{t.message}</p>
        </div>
      ))}
    </div>
  );
}