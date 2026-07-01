import type { GuestCategory } from "@/lib/types";

const STYLES: Record<GuestCategory, string> = {
  VVIP:    "border-amber-400/40 bg-amber-400/10 text-amber-300",
  VIP:     "border-amber-400/30 bg-amber-400/5 text-amber-200/80",
  MEDIA:   "border-sky-400/30 bg-sky-400/5 text-sky-300/80",
  REGULER: "border-white/10 bg-white/5 text-white/60",
  STAFF:   "border-emerald-400/30 bg-emerald-400/5 text-emerald-300/80",
};

export function CategoryBadge({ category, isVip }: { category: GuestCategory; isVip: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${STYLES[category]}`}
    >
      {isVip && <span className="text-amber-300">★</span>}
      {category}
    </span>
  );
}