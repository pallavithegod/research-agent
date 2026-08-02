import { AuthCard } from "@/components/auth-card";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function SignUpPage() {
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

        <Link href="/signin" className="hidden items-center gap-2 text-sm font-semibold text-[#332323]/64 transition hover:text-[#332323] sm:inline-flex">
          <ArrowLeft className="size-4" />
          Sign in
        </Link>
      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-6 pb-16">
        <AuthCard mode="signup" />
      </section>
    </main>
  );
}
