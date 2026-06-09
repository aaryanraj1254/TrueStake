import { supabase } from "./supabase";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

async function bearer(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

function send(path: string, init: RequestInit, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { ...init, headers });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init, await bearer());

  // Supabase access tokens expire after ~1 hour. On a 401, refresh the session
  // once (Supabase persists the new tokens to localStorage automatically) and
  // retry the original request with the fresh token.
  if (res.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      res = await send(path, init, data.session.access_token);
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
