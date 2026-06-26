import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/layout/LogoutButton";

// Item navigasi — akan ditambah per EPIC berikutnya
const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", code: "01" },
  { href: "/dashboard/events", label: "Events", code: "02" },
  { href: "/dashboard/live", label: "Live", code: "03" },
  { href: "/dashboard/reports", label: "Reports", code: "04" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* SIDEBAR — Aerospace / Cockpit */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-cockpit-10 px-6 py-10 md:flex">
        <div>
          {/* Brand */}
          <div className="mb-12">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Atrioom</p>
            <p className="font-heading text-2xl leading-none text-white">Workspace</p>
            <div className="mt-3 h-px w-12 bg-white/20" />
          </div>

          {/* Section label */}
          <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/30">Modules</p>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-baseline gap-3 rounded-2xl border border-transparent px-4 py-3 transition hover:border-cockpit-10 hover:bg-white/5"
              >
                <span className="font-body text-[10px] tabular-nums tracking-[0.3em] text-white/30 group-hover:text-white/60">
                  {item.code}
                </span>
                <span className="font-body text-sm uppercase tracking-[0.2em] text-white/80 group-hover:text-white">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer — logout */}
        <div className="border-t border-cockpit-10 pt-6">
          <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/30">Session</p>
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN — content area */}
      <main className="flex-1 px-8 py-10 md:px-14 md:py-14">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}