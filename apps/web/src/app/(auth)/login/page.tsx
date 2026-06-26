import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Masuk — Atrioom Workspace",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6">
      {/* Latar gradien radial — atmosfer "cockpit terminal" */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      <div className="heavy-frosted-glass relative w-full max-w-md rounded-3xl px-10 py-12">
        {/* Header — Instrument Serif */}
        <div className="mb-10 text-center">
          <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-white/40">
            Atrioom · Operational Console
          </p>
          <h1 className="font-heading text-5xl leading-none text-white">Atrioom Workspace</h1>
          <p className="mt-4 text-sm font-body font-light text-white/60">
            Masuk dengan akun operator front-desk Anda.
          </p>
        </div>

        {/* Form — Barlow */}
        <LoginForm />

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
          Encrypted session · Trusted device required
        </p>
      </div>
    </main>
  );
}