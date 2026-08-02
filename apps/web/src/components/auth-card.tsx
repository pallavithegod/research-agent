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
    <div className="w-full max-w-[430px] rounded-[28px] border border-white/72 bg-white/58 p-6 shadow-[0_22px_64px_rgba(44,57,72,0.14)] backdrop-blur-2xl sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/80 bg-white/88 text-[#201819] shadow-[0_12px_28px_rgba(44,57,72,0.12)]">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="mt-6 font-inter text-2xl font-black tracking-tight text-[#171111]">
          {isSignIn ? "Sign in" : "Create workspace"}
        </h1>
        <p className="mx-auto mt-2 max-w-[290px] text-sm leading-6 text-[#6b5757]">
          {isSignIn ? "Open the Multi-Step Research Agent dashboard." : "Create your research orchestration workspace."}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={startEmailFlow} className="grid gap-4">
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={!ready || status === "loading"}
            className="flex h-11 items-center justify-center gap-3 rounded-xl border border-black/10 bg-white/78 text-sm font-bold text-[#171111] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid size-5 place-items-center rounded-full bg-[#f5f5f5] text-xs font-black text-[#4285f4]">G</span>
            Continue with Google
          </button>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs text-[#7b6969]">
            <span className="h-px bg-black/10" />
            or
            <span className="h-px bg-black/10" />
          </div>

          <label className="grid gap-2 text-sm font-bold text-[#2b2020]">
            Email address
            <span className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white/78 px-3 shadow-sm focus-within:border-[#171111]">
              <Mail className="size-4 text-[#7b6969]" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#171111] outline-none placeholder:text-[#9c8f8f]"
                placeholder="you@example.com"
              />
            </span>
          </label>

          {!isSignIn ? (
            <div
              id="clerk-captcha"
              data-cl-theme="light"
              data-cl-size="flexible"
              className="min-h-0 overflow-hidden rounded-xl [&:not(:empty)]:border [&:not(:empty)]:border-black/10 [&:not(:empty)]:bg-white/78 [&:not(:empty)]:p-2"
            />
          ) : null}

          <button
            type="submit"
            disabled={!ready || status === "loading"}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#171111] text-sm font-black text-white shadow-[0_14px_32px_rgba(23,17,17,0.18)] transition hover:bg-[#2a2020] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : null}
            Continue
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-[#2b2020]">
            Verification code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="h-12 rounded-xl border border-black/10 bg-white/78 px-3 text-center font-mono text-lg font-semibold tracking-[0.22em] text-[#171111] shadow-sm outline-none transition focus:border-[#171111]"
              placeholder="000000"
            />
          </label>

          <button
            type="submit"
            disabled={!ready || status === "loading"}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#171111] text-sm font-black text-white shadow-[0_14px_32px_rgba(23,17,17,0.18)] transition hover:bg-[#2a2020] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : null}
            Verify and continue
          </button>

          <button type="button" onClick={() => setStep("email")} className="text-sm font-bold text-[#332323]/70 transition hover:text-[#171111]">
            Use a different email
          </button>
        </form>
      )}

      {message ? (
        <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${status === "error" ? "border-[#9d4b4b]/30 bg-[#fff0f0] text-[#7a2424]" : "border-[#2e6b52]/20 bg-[#ecfff7] text-[#255240]"}`}>
          {message}
        </p>
      ) : null}

      <div className="mt-6 border-t border-black/10 pt-5 text-center text-sm text-[#6b5757]">
        {isSignIn ? "Do not have an account?" : "Already have an account?"}{" "}
        <Link href={isSignIn ? "/signup" : "/signin"} className="font-black text-[#171111] hover:text-black">
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
