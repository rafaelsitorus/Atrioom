// Thin fetch wrapper ke apps/api (Node.js). Cookies di-forward otomatis
// (same-origin Next.js → Railway backend via INTERNAL_API_BASE_URL).
import { env } from "./env";

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

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${env.INTERNAL_API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
    // Jangan set Content-Type — browser auto-generate boundary untuk multipart
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