// Thin fetch wrapper ke apps/api (Node.js).
// Server-side: forward Supabase session sebagai Authorization: Bearer <jwt>.
// Client-side: pakai cookie-based session (browser handle otomatis).
import { env } from "./env";
import { headers as nextHeaders } from "next/headers";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getServerAuthHeader(): Promise<Record<string, string>> {
  // Dipanggil hanya dari Server Components / Server Actions.
  // Client components tidak akan masuk sini (mereka pakai cookie-based fetch).
  try {
    const h = await nextHeaders();
    // @supabase/ssr menyimpan JWT di cookie `sb-<projectref>-auth-token`
    // atau di custom header. Kita forward semua cookie sb-* yang ada.
    const cookieHeader = h.get("cookie") ?? "";
    return { cookie: cookieHeader };
  } catch {
    // Bukan Server Component (mis. dari Client Component) — skip
    return {};
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const extraHeaders = await getServerAuthHeader();

  const res = await fetch(`${env.INTERNAL_API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
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

export const api = {
  get:    <T>(path: string) => request<T>(path, { method: "GET" }),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => {
    return fetch(`${env.INTERNAL_API_BASE_URL}${path}`, {
      method: "POST",
      body: form,
      credentials: "include",
    }).then(async (res) => {
      if (res.status === 204) return undefined as T;
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = (body as { error?: { code?: string; message?: string } }).error;
        throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? "Upload failed");
      }
      return body as T;
    });
  },
};