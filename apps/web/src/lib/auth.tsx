"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, API_URL } from "@/lib/api";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  isAdmin: boolean;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ mfaRequired: boolean; mfaToken?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  beginOAuth: (provider: "google" | "github") => Promise<void>;
  requestMagicLink: (email: string) => Promise<void>;
  consumeMagicLink: (token: string) => Promise<{ mfaRequired: boolean }>;
  startPasskeyLogin: () => Promise<void>;
  finishPasskeyLogin: (response: unknown) => Promise<{ mfaRequired: boolean }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "elixio.auth";

/** Pull the access token from local storage. Client-only helper. */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { accessToken?: string };
    return parsed.accessToken ?? null;
  } catch {
    return null;
  }
}

function loadStored(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw) as { accessToken?: string; refreshToken?: string };
    return { accessToken: parsed.accessToken ?? null, refreshToken: parsed.refreshToken ?? null };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function store({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }));
}

function clear() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { accessToken, refreshToken } = loadStored();
    if (!accessToken || !refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      // Use the stored refresh token, keep it stable across calls
      const res = await api<{ tokens: AuthSession; user: AuthUser }>("/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken, rotate: false },
      });
      store(res.tokens);
      setUser(res.user);
    } catch {
      clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (email, password) => {
    const res = await api<{ user: AuthUser; tokens: AuthSession; mfaRequired: boolean }>(
      "/v1/auth/login",
      { method: "POST", body: { email, password } }
    );
    if (res.mfaRequired) {
      // mfaToken is a short-lived JWT the client posts to /v1/auth/mfa/verify.
      // We don't have it on the wire here — server mints it in a follow-up
      // call. For MVP, we tell the user to use a backup code.
      return { mfaRequired: true };
    }
    store(res.tokens);
    setUser(res.user);
    return { mfaRequired: false };
  }, []);

  const signOut = useCallback(async () => {
    const { refreshToken } = loadStored();
    if (refreshToken) {
      try {
        await api("/v1/auth/logout", { method: "POST", body: { refreshToken } });
      } catch {
        // ignore — clear local anyway
      }
    }
    clear();
    setUser(null);
  }, []);

  const beginOAuth = useCallback(async (provider: "google" | "github") => {
    const { authorizationUrl } = await api<{ authorizationUrl: string }>(
      "/v1/auth/oauth/begin",
      { method: "POST", body: { provider, redirectUri: `${window.location.origin}/auth/callback` } }
    );
    window.location.href = authorizationUrl;
  }, []);

  const requestMagicLink = useCallback(async (email: string) => {
    await api("/v1/auth/magic-link/request", { method: "POST", body: { email } });
  }, []);

  const consumeMagicLink = useCallback(async (token: string) => {
    const res = await api<{ user: AuthUser; tokens: AuthSession; mfaRequired: boolean }>(
      "/v1/auth/magic-link/consume",
      { method: "POST", body: { token } }
    );
    if (!res.mfaRequired) {
      store(res.tokens);
      setUser(res.user);
    }
    return { mfaRequired: res.mfaRequired };
  }, []);

  const startPasskeyLogin = useCallback(async () => {
    await api("/v1/auth/passkey/login/begin", { method: "POST" });
  }, []);

  const finishPasskeyLogin = useCallback(async (response: unknown) => {
    const res = await api<{ user: AuthUser; session: { user: AuthUser; tokens: AuthSession; mfaRequired?: boolean } }>(
      "/v1/auth/passkey/login/finish",
      { method: "POST", body: response }
    );
    if (!res.session.mfaRequired) {
      store(res.session.tokens);
      setUser(res.session.user);
    }
    return { mfaRequired: res.session.mfaRequired ?? false };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      refresh,
      beginOAuth,
      requestMagicLink,
      consumeMagicLink,
      startPasskeyLogin,
      finishPasskeyLogin,
    }),
    [user, loading, signIn, signOut, refresh, beginOAuth, requestMagicLink, consumeMagicLink, startPasskeyLogin, finishPasskeyLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export { API_URL };
