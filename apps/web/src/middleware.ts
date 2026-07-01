// Next.js middleware — penjaga Protected Routes untuk EPIC00.
// - Refresh sesi Supabase di setiap request
// - Redirect ke /login bila belum auth (kecuali halaman publik)
// - Redirect ke /dashboard bila sudah auth dan访问 /login
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Rute publik — boleh diakses tanpa login
const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/trusted-device",
  "/favicon.ico",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Izinkan asset Next & PWA
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/icons")) return true;
  if (pathname.startsWith("/manifest")) return true;
  // Public ticket page (EPIC03) — tamu buka tanpa login
  if (pathname.startsWith("/ticket/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { user, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // 1. Halaman publik
  if (isPublic(pathname)) {
    // Jika sudah login dan访问 halaman login → lempar ke dashboard
    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // 2. Rute terproteksi — wajib punya sesi
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

// Jalankan di semua route KECUALI static asset & API internal.
// Pakai runtime Node.js (bukan Edge) agar kompatibel dengan @supabase/ssr
// yang punya dependencies Node-specific saat refresh session.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)",
  ],
  runtime: "nodejs",
};