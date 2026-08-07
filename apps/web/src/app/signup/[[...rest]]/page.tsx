import { AuthCard } from "@/components/auth-card";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function SignUpPage() {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true") {
    redirect("/");
  }
  return (
    <main id="main" className="relative min-h-screen overflow-hidden bg-[#121212] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(125,108,255,0.18),transparent_28rem)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <Link href="/" className="inline-flex items-center gap-3 font-inter text-base font-black text-white">
          <span className="grid size-9 place-items-center rounded-xl bg-[#7d6cff] p-1.5 shadow-lg shadow-[#7d6cff]/20">
            <Image src="/artificial.png" alt="" width={28} height={28} className="size-full object-contain" priority />
          </span>
          Research Agent
        </Link>

        <Link href="/signin" className="hidden items-center gap-2 text-sm font-semibold text-[#aaa] transition hover:text-white sm:inline-flex">
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
