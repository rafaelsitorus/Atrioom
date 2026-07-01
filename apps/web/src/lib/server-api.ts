// Server-side API wrapper. HANYA untuk dipakai di Server Components
// atau Server Actions. Auto-forward Supabase session cookie.
import { env } from "./env";
import { headers as nextHeaders } from "next/headers";
import { ApiError } from "./api-client";

async function getServerCookieHeader(): Promise<string> {
  const h = await nextHeaders();
  return h.get("cookie") ?? "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieHeader = await getServerCookieHeader();
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