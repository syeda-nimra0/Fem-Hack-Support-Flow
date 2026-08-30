/**
 * API client for the SupportFlow Express backend (MERN server/).
 *
 * The React app talks directly to the Express server:
 *   REST    → VITE_API_URL  (default http://localhost:3001)
 *   Sockets → VITE_SOCKET_URL (default http://localhost:3002)
 * Configure via the client/.env file.
 *
 * Vercel note: serverless functions cannot hold WebSockets, so the deployed
 * client leaves VITE_SOCKET_URL empty — the app then falls back to polling
 * (see lib/socket.ts isRealtimeEnabled()).
 */

const TOKEN_KEY = "supportflow_token";
const USER_KEY = "supportflow_user";

// Normalize: strip trailing slashes so `${API_URL}/api/...` never produces a
// double slash (e.g. VITE_API_URL="https://x.vercel.app/" would request
// "https://x.vercel.app//api/auth/login" — Vercel answers that with a 308
// redirect that carries NO CORS headers, so browsers report a CORS error).
export const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:3001"
).replace(/\/+$/, "");

export const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) || "";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: unknown) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredUser<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 75000, ...init } = options;
  const token = getToken();
  const url = `${API_URL}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(res.status, data.error || "Request failed.", data.fields);
    }
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new ApiError(408, "The request timed out. Please try again.");
    }
    throw new ApiError(0, "Cannot reach the SupportFlow server.");
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};
