// Supabase untuk SERVER COMPONENTS, SERVER ACTIONS, dan ROUTE HANDLERS.
// Pakai @supabase/ssr agar cookies di Next.js App Router tersinkronisasi.
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions, type CookieMethodsServer } from "@supabase/ssr";
import { env } from "../env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options as CookieOptions),
        );
      } catch {
        // Aman diabaikan di Server Component (read-only).
        // Akan tereksekusi di Server Action / Route Handler.
      }
    },
  };

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: cookieMethods },
  );
}