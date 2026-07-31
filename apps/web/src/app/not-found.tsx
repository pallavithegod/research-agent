import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";

export default function NotFound() {
  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-48px)] bg-[#181818] px-4 py-6 text-white sm:px-6 lg:px-8">
        <section className="rounded border border-[#333] bg-[#202020] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e8bd]">Not Found</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">This dashboard page does not exist.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa]">Use the sidebar to open one of the standalone dashboard sections.</p>
          <Link href="/" className="mori-button mori-button-sm mt-6 inline-flex">
            Back to overview
          </Link>
        </section>
      </div>
    </DashboardShell>
  );
}
