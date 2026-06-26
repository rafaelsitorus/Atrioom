// Halaman dashboard placeholder — akan diisi oleh EPIC01 (Events).
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Status</p>
        <h1 className="font-heading text-4xl leading-tight text-white">
          Sistem siap · operator terverifikasi
        </h1>
      </header>

      <div className="heavy-frosted-glass rounded-3xl p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Sesi Aktif</p>
        <p className="mt-3 font-body text-base text-white/80">{user?.email}</p>
        <p className="mt-6 text-xs text-white/40">
          Pilih modul di sidebar untuk mulai bekerja — Events, Seating, Check-In, atau Reports.
        </p>
      </div>
    </section>
  );
}