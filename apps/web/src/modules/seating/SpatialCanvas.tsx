"use client";

// Spatial Canvas 2D — viewport pan/zoom via Framer Motion.
// Render meja & kursi sebagai div absolut di dalam container yang di-transform.
// Highlight kursi berdasarkan search dari store.
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSeatingStore } from "./store";
import { DropTarget } from "./DropTarget";
import type { TableRow, SeatRow } from "@/lib/types-seating";

interface Props { eventId: string }

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export function SpatialCanvas({ eventId }: Props) {
  const tables = useSeatingStore((s) => s.tables);
  const seats = useSeatingStore((s) => s.seats);
  const search = useSeatingStore((s) => s.search);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wheel zoom (Ctrl+Wheel atau trackpad pinch)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale.get() + delta * ZOOM_STEP * 10));
      scale.set(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale]);

  const transform = useTransform([x, y, scale], ([tx, ty, s]) => `translate(${tx}px, ${ty}px) scale(${s})`);

  function handlePanEnd(_: unknown, info: PanInfo) {
    x.set(x.get() + info.offset.x);
    y.set(y.get() + info.offset.y);
  }

  function zoomIn() {
    scale.set(Math.min(MAX_ZOOM, scale.get() + ZOOM_STEP));
  }
  function zoomOut() {
    scale.set(Math.max(MIN_ZOOM, scale.get() - ZOOM_STEP));
  }
  function reset() {
    x.set(0); y.set(0); scale.set(1);
  }

  const seatsByTable = useMemo(() => {
    const map = new Map<string, SeatRow[]>();
    seats.forEach((s) => {
      if (!map.has(s.table_id)) map.set(s.table_id, []);
      map.get(s.table_id)!.push(s);
    });
    return map;
  }, [seats]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-cockpit-10 bg-black/60">
      {/* Canvas viewport */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <motion.div
          drag
          dragMomentum={false}
          onDragEnd={handlePanEnd}
          style={{ x, y, scale, transformOrigin: "0 0", touchAction: "none" }}
          className="relative h-full w-full"
        >
          {/* Background grid — aerospace */}
          <GridPattern />
          {/* Render tables + seats */}
          {tables.map((t) => (
            <TableNode
              key={t.id}
              table={t}
              seats={seatsByTable.get(t.id) ?? []}
              search={search}
              canvasW={size.w}
              canvasH={size.h}
            />
          ))}
        </motion.div>
      </div>

      {/* HUD overlay — zoom & reset */}
      <div className="absolute bottom-4 right-4 flex gap-2 rounded-full border border-cockpit-10 bg-black/70 px-2 py-1 backdrop-blur-md">
        <button
          onClick={zoomOut}
          className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/60 hover:bg-white/5 hover:text-white"
          title="Zoom out (Ctrl+Scroll)"
        >
          −
        </button>
        <button
          onClick={reset}
          className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/40 hover:text-white"
          title="Reset view"
        >
          1:1
        </button>
        <button
          onClick={zoomIn}
          className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/60 hover:bg-white/5 hover:text-white"
          title="Zoom in (Ctrl+Scroll)"
        >
          +
        </button>
      </div>

      {/* Hint */}
      <div className="absolute left-4 top-4 rounded-full border border-cockpit-10 bg-black/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white/40 backdrop-blur-md">
        Drag to pan · Ctrl+Scroll to zoom
      </div>
    </div>
  );
}

function GridPattern() {
  // Grid 80px — pure CSS, fixed di scaled layer
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
        width: 4000,
        height: 4000,
        top: -1000,
        left: -1000,
      }}
    />
  );
}

interface TableNodeProps {
  table: TableRow;
  seats: SeatRow[];
  search: string;
  canvasW: number;
  canvasH: number;
}

function TableNode({ table, seats, search }: TableNodeProps) {
  return (
    <div
      className="absolute"
      style={{
        // Tabel di koordinat canvas — tengah (canvasW/2, canvasH/2) adalah anchor (0,0)
        left: `calc(50% + ${table.pos_x}px)`,
        top: `calc(50% + ${table.pos_y}px)`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Table body */}
      <div
        className={`flex items-center justify-center border border-cockpit-20 bg-white/[0.03] backdrop-blur-md ${
          table.shape === "ROUND"
            ? "h-32 w-32 rounded-full"
            : table.shape === "LONG"
              ? "h-20 w-72 rounded-3xl"
              : "h-32 w-56 rounded-3xl"
        }`}
      >
        <div className="text-center">
          <p className="font-heading text-2xl text-white">{table.label}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/40">
            {seats.length} / {table.capacity}
          </p>
        </div>
      </div>

      {/* Seats — posisi offset dari table center */}
      {seats.map((s) => (
        <SeatMarker key={s.id} seat={s} table={table} search={search} />
      ))}
    </div>
  );
}

function SeatMarker({ seat, table, search }: { seat: SeatRow; table: TableRow; search: string }) {
  const assignment = useSeatingStore((s) => s.assignments.find((a) => a.seat_id === seat.id));
  const isHighlighted =
    search.length > 0 &&
    (seat.seat_label.toLowerCase().includes(search.toLowerCase()) ||
      (assignment?.guest_name.toLowerCase().includes(search.toLowerCase()) ?? false));

  const occupied = !!assignment;

  return (
    <div
      className="absolute"
      style={{
        left: `calc(50% + ${seat.pos_x}px)`,
        top: `calc(50% + ${seat.pos_y}px)`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <DropTarget seatId={seat.id} occupied={occupied}>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
            occupied
              ? "border border-white/30 bg-white/90 text-black"
              : "border border-white/20 bg-transparent text-white/60 hover:border-white/40"
          } ${isHighlighted ? "ring-2 ring-amber-300/70 ring-offset-2 ring-offset-black/50" : ""}`}
          title={`${table.label} · ${seat.seat_label}${assignment ? ` · ${assignment.guest_name}` : ""}`}
        >
          {occupied ? (
            <span className="text-[10px] font-medium tabular-nums">
              {assignment.guest_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </span>
          ) : (
            <span className="text-[9px] uppercase tracking-tighter text-white/30">
              {seat.seat_label.split("-").pop()}
            </span>
          )}
        </div>
      </DropTarget>
    </div>
  );
}