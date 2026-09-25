import axios, { type InternalAxiosRequestConfig } from "axios";

// ── In-memory access token (not localStorage — cleared on page refresh) ──

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ── Session expiry callback ──
// Called when the refresh token itself is expired/invalid and the user must re-login.
// AuthContext registers a listener to clear the query cache → ProtectedRoute redirects.

type SessionExpiredListener = () => void;
let onSessionExpired: SessionExpiredListener | null = null;

export function setOnSessionExpired(listener: SessionExpiredListener | null): void {
  onSessionExpired = listener;
}

// ── Axios instance ──

export const api = axios.create({
  baseURL: import.meta.env.DEV
    ? "/api/admin"
    : `${import.meta.env.VITE_API_URL ?? "/api"}/admin`,
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // required for httpOnly refresh cookie
});

/** Axios instance for non-admin API routes (e.g. /rates, /orders). */
export const publicApi = axios.create({
  baseURL: import.meta.env.DEV
    ? "/api"
    : (import.meta.env.VITE_API_URL ?? "/api"),
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ── Request interceptor ──

function attachToken(config: InternalAxiosRequestConfig) {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

api.interceptors.request.use(attachToken);
publicApi.interceptors.request.use(attachToken);

// ── Response interceptor — silent token refresh on 401 ──

let isRefreshing = false;
type RefreshSubscriber = { resolve: (token: string) => void; reject: (err: Error) => void };
let refreshQueue: RefreshSubscriber[] = [];

function drainQueue(token: string): void {
  refreshQueue.forEach(({ resolve }) => resolve(token));
  refreshQueue = [];
}

function rejectQueue(err: Error): void {
  refreshQueue.forEach(({ reject }) => reject(err));
  refreshQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const is401 = err.response?.status === 401;
    const isRefreshEndpoint = originalRequest.url?.includes("/auth/refresh");
    const hadToken = !!originalRequest.headers.Authorization;

    // Only refresh if the request had a token (expired token scenario).
    // Skip for login/public endpoints where 401 means bad credentials.
    if (is401 && hadToken && !originalRequest._retry && !isRefreshEndpoint) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        const { data } = await api.post<{ accessToken: string }>("/auth/refresh");
        setAccessToken(data.accessToken);
        drainQueue(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        setAccessToken(null);
        rejectQueue(refreshErr as Error);
        // Don't nuke session immediately — let TanStack refetch /me to confirm
        // This avoids permanent logout from transient network blips
        onSessionExpired?.();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      err.response?.data?.error ??
      err.response?.data?.message ??
      err.message ??
      "Something went wrong";
    const error = new Error(message);
    // Preserve HTTP status so callers can distinguish 4xx from 5xx
    (error as any).status = err.response?.status;
    return Promise.reject(error);
  },
);
