"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import Link from "next/link";

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true"
  && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function SsoCallbackPage() {
  if (!clerkEnabled) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#121212] px-5 text-white">
        <section className="max-w-sm rounded-2xl border border-white/10 bg-[#1b1b1b] p-6 text-center shadow-2xl">
          <h1 className="text-lg font-semibold">Sign-in is not configured</h1>
          <p className="mt-2 text-sm leading-6 text-[#999]">Add a Clerk publishable key to enable single sign-on for this workspace.</p>
          <Link href="/" className="mt-5 inline-flex rounded-lg bg-[#7d6cff] px-3 py-2 text-sm font-medium text-white">Return to research</Link>
        </section>
      </main>
    );
  }

  return <AuthenticateWithRedirectCallback />;
}
