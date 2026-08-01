"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

type ApiFetchOptions = RequestInit & {
  token?: string | null;
};

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
  });
}

export function useAuthenticatedApi() {
  const { getToken } = useAuth();

  return useCallback(async function authenticatedApiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();
    return apiFetch(path, { ...options, token });
  }, [getToken]);
}
