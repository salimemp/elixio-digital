import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (typeof extra.apiUrl === "string" && extra.apiUrl ? extra.apiUrl : "") ||
  "http://localhost:3000";

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  authToken?: string | null;
}

const STORAGE_KEY = "elixio.auth";
const SECURE_KEYS = {
  access: "elixio.auth.access",
  refresh: "elixio.auth.refresh",
};

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

export const Auth = {
  async load() {
    try {
      const access = await SecureStore.getItemAsync(SECURE_KEYS.access);
      const refresh = await SecureStore.getItemAsync(SECURE_KEYS.refresh);
      return { accessToken: access, refreshToken: refresh };
    } catch {
      return { accessToken: null, refreshToken: null };
    }
  },
  async store({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) {
    await SecureStore.setItemAsync(SECURE_KEYS.access, accessToken);
    await SecureStore.setItemAsync(SECURE_KEYS.refresh, refreshToken);
  },
  async clear() {
    await SecureStore.deleteItemAsync(SECURE_KEYS.access);
    await SecureStore.deleteItemAsync(SECURE_KEYS.refresh);
  },
};

export { API_URL, STORAGE_KEY };
