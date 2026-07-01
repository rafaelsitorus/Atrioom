// Server-side API wrapper. HANYA untuk dipakai di Server Components
// atau Server Actions. Auto-forward Supabase session cookie.
//
// Pakai `cookies()` dari next/headers (bukan headers().get('cookie'))
// karena cookies() adalah API resmi Next.js untuk baca cookies di
// Server Component. headers().get('cookie') sering return null di Vercel.
import { env } from "./env";
import { cookies, headers as nextHeaders } from "next/headers";
import { ApiError } from "./api-client";

function buildCookieHeader(): string {
  // Gabungan cookies dari next/headers + raw 'cookie' header
  // (fallback untuk environment tertentu).
  const cookieStore = cookies();
  const parts: string[] = [];

  // Method 1: cookies() — official API, works di Vercel
  try {
    cookieStore.getAll().forEach((c) => {
      parts.push(`${c.name}=${c.value}`);
    });
  } catch {
    // Skip kalau bukan Server Component context
  }

  // Method 2: raw 'cookie' header fallback (beberapa env Vercel)
  if (parts.length === 0) {
    try {
      const raw = nextHeaders().get("cookie");
      if (raw) return raw;
    } catch {
      // ignore
    }
  }

  return parts.join("; ");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieHeader = buildCookieHeader();
  const res = await fetch(`${env.INTERNAL_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; details?: unknown } }).error;
    throw new ApiError(
      res.status,
      err?.code ?? "UNKNOWN",
      err?.message ?? `Request failed: ${res.status}`,
      err?.details,
    );
  }

  return body as T;
}

export const serverApi = {
  get:    <T>(path: string) => request<T>(path, { method: "GET" }),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};