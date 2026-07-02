// Debug API route — di-hit dari browser untuk inspect cookie forwarding.
// Hapus setelah masalah teratasi.
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = cookies();
  const all = cookieStore.getAll();

  // Build cookie header
  const cookieHeader = all.map((c) => `${c.name}=${c.value}`).join("; ");

  // Forward ke Render debug endpoint
  let renderResponse: unknown = null;
  let renderError: string | null = null;
  try {
    const res = await fetch(`${env.INTERNAL_API_BASE_URL}/v1/debug/request`, {
      headers: {
        cookie: cookieHeader,
      },
    });
    renderResponse = await res.json();
  } catch (e) {
    renderError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    vercel_cookies: {
      count: all.length,
      names: all.map((c) => c.name),
      lengths: all.map((c) => ({ name: c.name, length: c.value.length })),
    },
    cookie_header_built: cookieHeader.substring(0, 50) + "...",
    cookie_header_length: cookieHeader.length,
    render_sees: renderResponse,
    render_error: renderError,
  });
}
