import { SignIn } from "@clerk/nextjs";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main id="main" className="relative min-h-screen overflow-hidden bg-[#eef6fb] text-[#171111]">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/login-back.jpg')" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.22)_45%,rgba(255,255,255,0.76))]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <Link href="/" className="inline-flex items-center gap-3 font-inter text-base font-black text-[#1c1717]">
          <span className="grid size-9 place-items-center rounded-xl bg-white/72 p-1.5 shadow-lg shadow-black/10 backdrop-blur">
            <Image src="/artificial.png" alt="" width={28} height={28} className="size-full object-contain" priority />
          </span>
          Research Agent
        </Link>

        <Link href="/" className="hidden items-center gap-2 text-sm font-semibold text-[#332323]/64 transition hover:text-[#332323] sm:inline-flex">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-6 pb-16">
        <div className="w-full max-w-[430px] rounded-[28px] border border-white/72 bg-white/58 p-6 shadow-[0_22px_64px_rgba(44,57,72,0.14)] backdrop-blur-2xl sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/80 bg-white/88 text-[#201819] shadow-[0_12px_28px_rgba(44,57,72,0.12)]">
              <ShieldCheck className="size-7" />
            </div>
            <h1 className="mt-6 font-inter text-2xl font-black tracking-tight text-[#171111]">Sign in</h1>
            <p className="mx-auto mt-2 max-w-[280px] text-sm leading-6 text-[#6b5757]">
              Authenticate with Clerk to open the Multi-Step Research Agent dashboard.
            </p>
          </div>

          <SignIn
            routing="path"
            path="/signin"
            signUpUrl="/signup"
            forceRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "w-full border-0 bg-transparent shadow-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border border-black/10 bg-white/72 text-[#171111] shadow-sm hover:bg-white",
                formButtonPrimary:
                  "bg-[#171111] text-white shadow-[0_14px_32px_rgba(23,17,17,0.18)] hover:bg-[#2a2020]",
                formFieldInput:
                  "rounded-xl border-black/10 bg-white/72 text-[#171111] shadow-sm focus:border-[#171111] focus:ring-[#171111]",
                footerActionLink: "text-[#171111] font-semibold hover:text-black",
              },
            }}
          />
        </div>
      </section>
    </main>
  );
}
