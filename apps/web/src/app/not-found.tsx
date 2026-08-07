import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";

export default function NotFound() {
  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-56px)] bg-[#121212] px-5 py-8 text-white lg:px-10">
        <section className="rounded-xl border border-white/[0.08] bg-[#191919] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a8fff]">Not Found</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">This dashboard page does not exist.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa]">Use the sidebar to return to a research thread or open the library.</p>
          <Link href="/" className="mt-6 inline-flex rounded-lg bg-[#7d6cff] px-3 py-2 text-sm font-semibold text-white">
            Back to research
          </Link>
        </section>
      </div>
    </DashboardShell>
  );
}
