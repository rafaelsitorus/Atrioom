// Offline fallback page — dilayani SW bila network hilang.
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="heavy-frosted-glass max-w-md rounded-3xl px-10 py-12 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Connection Lost</p>
        <h1 className="mt-3 font-heading text-5xl text-white">Offline</h1>
        <p className="mt-4 text-sm font-body text-white/60">
          Koneksi internet tidak tersedia. Data yang sudah di-cache ke perangkat masih bisa diakses.
        </p>
        <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-white/30">
          Atrioom · Operational Console
        </p>
      </div>
    </main>
  );
}
