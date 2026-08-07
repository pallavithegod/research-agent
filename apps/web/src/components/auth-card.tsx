"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

type AuthMode = "signin" | "signup";
type AuthStep = "email" | "code";

type ClerkError = {
  errors?: Array<{ longMessage?: string; message?: string }>;
  message?: string;
};

export function AuthCard({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const signInState = useSignIn();
  const signUpState = useSignUp();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const isSignIn = mode === "signin";
  const ready = isSignIn ? signInState.isLoaded : signUpState.isLoaded;

  async function startEmailFlow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail.includes("@")) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      if (isSignIn) {
        if (!signInState.isLoaded) return;
        const created = await signInState.signIn.create({ identifier: cleanEmail });
        const emailFactor = created.supportedFirstFactors?.find((factor) => factor.strategy === "email_code");

        if (!emailFactor || !("emailAddressId" in emailFactor)) {
          throw new Error("Email code sign-in is not enabled for this Clerk application.");
        }

        await signInState.signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
      } else {
        if (!signUpState.isLoaded) return;
        await signUpState.signUp.create({ emailAddress: cleanEmail });
        await signUpState.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      }

      setStep("code");
      setStatus("idle");
      setMessage("We sent a verification code to your email.");
    } catch (error) {
      setStatus("error");
      setMessage(readClerkError(error, isSignIn ? "Could not start sign in." : "Could not create your account."));
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCode = code.trim();

    if (cleanCode.length < 4) {
      setStatus("error");
      setMessage("Enter the verification code from your email.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      if (isSignIn) {
        if (!signInState.isLoaded) return;
        const result = await signInState.signIn.attemptFirstFactor({
          strategy: "email_code",
          code: cleanCode,
        });
        const sessionId = result.createdSessionId;
        if (!sessionId) {
          throw new Error("Sign in needs another verification step.");
        }
        await signInState.setActive({ session: sessionId });
      } else {
        if (!signUpState.isLoaded) return;
        const result = await signUpState.signUp.attemptEmailAddressVerification({ code: cleanCode });
        if (!result.createdSessionId) {
          throw new Error("Sign up needs another verification step.");
        }
        await signUpState.setActive({ session: result.createdSessionId });
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(readClerkError(error, isSignIn ? "Could not verify sign in." : "Could not verify sign up."));
    }
  }

  async function continueWithGoogle() {
    setStatus("loading");
    setMessage("");

    try {
      if (isSignIn) {
        if (!signInState.isLoaded) return;
        await signInState.signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } else {
        if (!signUpState.isLoaded) return;
        await signUpState.signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      }
    } catch (error) {
      setStatus("error");
      setMessage(readClerkError(error, "Could not continue with Google."));
    }
  }

  return (
    <div className="w-full max-w-[430px] rounded-2xl border border-white/[0.1] bg-[#1b1b1b] p-6 shadow-[0_22px_64px_rgba(0,0,0,0.35)] sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#7d6cff] text-white shadow-[0_12px_28px_rgba(125,108,255,0.2)]">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="mt-6 font-inter text-2xl font-black tracking-tight text-white">
          {isSignIn ? "Sign in" : "Create workspace"}
        </h1>
        <p className="mx-auto mt-2 max-w-[290px] text-sm leading-6 text-[#a4a4a4]">
          {isSignIn ? "Open the Multi-Step Research Agent dashboard." : "Create your research orchestration workspace."}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={startEmailFlow} className="grid gap-4">
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={!ready || status === "loading"}
            className="flex h-11 items-center justify-center gap-3 rounded-xl border border-white/[0.12] bg-[#242424] text-sm font-bold text-white transition hover:bg-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid size-5 place-items-center rounded-full bg-[#f5f5f5] text-xs font-black text-[#4285f4]">G</span>
            Continue with Google
          </button>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs text-[#888]">
            <span className="h-px bg-white/[0.1]" />
            or
            <span className="h-px bg-white/[0.1]" />
          </div>

          <label className="grid gap-2 text-sm font-bold text-[#ddd]">
            Email address
            <span className="flex h-11 items-center gap-2 rounded-xl border border-white/[0.1] bg-[#151515] px-3 focus-within:border-[#8576ff]">
              <Mail className="size-4 text-[#888]" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-[#777]"
                placeholder="you@example.com"
              />
            </span>
          </label>

          {!isSignIn ? (
            <div
              id="clerk-captcha"
              data-cl-theme="light"
              data-cl-size="flexible"
              className="min-h-0 overflow-hidden rounded-xl [&:not(:empty)]:border [&:not(:empty)]:border-white/10 [&:not(:empty)]:bg-[#151515] [&:not(:empty)]:p-2"
            />
          ) : null}

          <button
            type="submit"
            disabled={!ready || status === "loading"}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7d6cff] text-sm font-black text-white transition hover:bg-[#8b7dff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : null}
            Continue
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-[#ddd]">
            Verification code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="h-12 rounded-xl border border-white/10 bg-[#151515] px-3 text-center font-mono text-lg font-semibold tracking-[0.22em] text-white outline-none transition focus:border-[#8576ff]"
              placeholder="000000"
            />
          </label>

          <button
            type="submit"
            disabled={!ready || status === "loading"}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7d6cff] text-sm font-black text-white transition hover:bg-[#8b7dff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : null}
            Verify and continue
          </button>

          <button type="button" onClick={() => setStep("email")} className="text-sm font-bold text-[#999] transition hover:text-white">
            Use a different email
          </button>
        </form>
      )}

      {message ? (
        <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${status === "error" ? "border-[#6b3239] bg-[#2d191c] text-[#ffb8bf]" : "border-[#315544] bg-[#17231e] text-[#b9dfc8]"}`}>
          {message}
        </p>
      ) : null}

      <div className="mt-6 border-t border-white/[0.1] pt-5 text-center text-sm text-[#999]">
        {isSignIn ? "Do not have an account?" : "Already have an account?"}{" "}
        <Link href={isSignIn ? "/signup" : "/signin"} className="font-black text-[#aaa0ff] hover:text-white">
          {isSignIn ? "Sign up" : "Sign in"}
        </Link>
      </div>
    </div>
  );
}

function readClerkError(error: unknown, fallback: string) {
  const clerkError = error as ClerkError;
  return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? clerkError.message ?? fallback;
}
