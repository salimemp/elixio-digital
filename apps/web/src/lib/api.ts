import type { Asset, AssetDetail, PaginatedResponse, Storefront } from "@elixio/shared";

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }
  return url.replace(/\/$/, "");
}

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

async function fetchJson<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { ok: false, error: message };
  }
}

export async function getAssets(): Promise<ApiResult<PaginatedResponse<Asset>>> {
  return fetchJson(`${getApiBaseUrl()}/assets`);
}

export async function getAsset(id: string): Promise<ApiResult<AssetDetail>> {
  return fetchJson(`${getApiBaseUrl()}/assets/${id}`);
}

export async function getStorefront(slug: string): Promise<ApiResult<Storefront>> {
  return fetchJson(`${getApiBaseUrl()}/storefronts/${slug}`);
}
