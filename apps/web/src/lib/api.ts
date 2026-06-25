// Shared API client for the web app. Single place for base URL,
// fetch wrapper, and typed responses. All auth pages import from here.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type ApiResult<T> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; data?: undefined; error: string };

export interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  authToken?: string | null;
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.authToken) {
    headers.set("Authorization", `Bearer ${options.authToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data?.error?.message ?? data?.message ?? message;
    } catch {
      // ignore
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// Convenience helpers for common read endpoints. Each returns a wrapped
// `ApiResult` so callers can do `if (!result.ok) ...` cleanly in
// server components. Throws are caught and converted.
export async function getAssets(
  params: Record<string, string> = {}
): Promise<ApiResult<unknown[]>> {
  try {
    const data = await api<unknown[]>(`/v1/assets?${new URLSearchParams(params).toString()}`);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function getAsset(id: string): Promise<ApiResult<unknown>> {
  try {
    const data = await api<unknown>(`/v1/assets/${encodeURIComponent(id)}`);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function getStorefront(slug: string): Promise<ApiResult<unknown>> {
  try {
    const data = await api<unknown>(`/v1/storefronts/${encodeURIComponent(slug)}`);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export { API_URL };
