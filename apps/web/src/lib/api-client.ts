"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/api/backend").replace(/\/$/, "");
const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true"
  && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

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

export const useAuthenticatedApi = clerkEnabled ? useClerkAuthenticatedApi : useLocalApi;

function useLocalApi() {
  return useCallback(async function localApiFetch(path: string, options: RequestInit = {}) {
    return apiFetch(path, options);
  }, []);
}

function useClerkAuthenticatedApi() {
  const { getToken } = useAuth();

  return useCallback(async function authenticatedApiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();
    return apiFetch(path, { ...options, token });
  }, [getToken]);
}
