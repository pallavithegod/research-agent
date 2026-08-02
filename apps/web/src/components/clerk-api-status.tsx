"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { CheckCircle2, ShieldCheck, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthenticatedApi } from "@/lib/api-client";

type ApiState =
  | { status: "idle" | "loading" }
  | { status: "ready"; isMock: boolean }
  | { status: "error"; message: string };

export function ClerkApiStatus() {
  const apiFetch = useAuthenticatedApi();
  const [state, setState] = useState<ApiState>({ status: "idle" });

  useEffect(() => {
    let active = true;

    async function loadMe() {
      setState({ status: "loading" });
      try {
        const response = await apiFetch("/v1/auth/me");
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const payload = (await response.json()) as { user: { is_mock: boolean } };
        if (active) {
          setState({
            status: "ready",
            isMock: payload.user.is_mock,
          });
        }
      } catch (error) {
        if (active) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not reach API",
          });
        }
      }
    }

    void loadMe();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  return (
    <section className="mt-6 rounded border border-[#333] bg-[#202020] p-4">
      <SignedIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded bg-[#26352f] text-[#67e8bd]">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">Clerk session active</h2>
              <p className="mt-1 text-sm leading-5 text-[#aaa]">Signed in with a protected session.</p>
            </div>
          </div>
          <ApiBadge state={state} />
        </div>
      </SignedIn>
      <SignedOut>
        <div className="flex items-center gap-3 text-sm text-[#aaa]">
          <WifiOff size={18} className="text-[#f7b500]" />
          Sign in with Clerk to call the backend API.
        </div>
      </SignedOut>
    </section>
  );
}

function ApiBadge({ state }: { state: ApiState }) {
  switch (state.status) {
    case "loading":
    case "idle":
      return <span className="rounded border border-[#3a3a3a] px-3 py-1 text-xs font-semibold text-[#aaa]">Checking API</span>;
    case "error":
      return (
        <span className="rounded border border-[#5d3939] bg-[#2a1f1f] px-3 py-1 text-xs font-semibold text-[#ffb6b6]">
          API not connected: {state.message}
        </span>
      );
    case "ready":
      return (
        <span className="inline-flex items-center gap-2 rounded border border-[#67e8bd]/40 bg-[#183029] px-3 py-1 text-xs font-semibold text-[#9ff6d3]">
          <CheckCircle2 size={14} />
          API connected{state.isMock ? " locally" : ""}
        </span>
      );
  }
}
