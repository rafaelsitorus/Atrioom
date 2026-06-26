// Klien Supabase khusus Next.js middleware (Edge runtime).
// Dipakai oleh middleware.ts untuk refresh session di setiap request.
import { createServerClient, type CookieOptions, type CookieMethodsServer } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { env } from "../env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options as CookieOptions),
      );
    },
  };

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: cookieMethods },
  );

  // PENTING: getUser() di middleware akan me-refresh session jika expired.
  // Jangan diganti getSession() — itu tidak memvalidasi token ke Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, response };
}