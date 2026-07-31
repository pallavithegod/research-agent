import { ArrowRight, CheckCircle2, CircleDollarSign, Clock3, LayoutGrid, Plus, SlidersHorizontal } from "lucide-react";
import type { DashboardPage } from "@/lib/dashboard-pages";

export function DashboardSectionPage({ page }: { page: DashboardPage }) {
  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#181818] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="w-full">
        <section className="rounded border border-[#333] bg-[#202020] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e8bd]">{page.eyebrow}</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{page.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa]">{page.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="mori-button mori-button-sm inline-flex items-center gap-2">
              <Plus size={16} />
              {page.primaryAction}
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded border border-[#3a3a3a] px-3 text-sm font-semibold text-[#d8d8d8] hover:bg-[#2b2b2b]">
              <SlidersHorizontal size={16} />
              {page.secondaryAction}
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {page.metrics.map((metric) => (
            <div key={metric.label} className="rounded border border-[#333] bg-[#242424] p-5">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="text-[#67e8bd]" size={18} />
                <h2 className="text-base font-semibold">{metric.label}</h2>
              </div>
              <p className="mt-6 text-3xl font-semibold">{metric.value}</p>
              <p className="mt-2 text-sm leading-6 text-[#aaa]">{metric.copy}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          {page.panels.map((panel) => (
            <div key={panel.title} className="rounded border border-[#333] bg-[#242424] p-5">
              <div className="flex items-center gap-2">
                <LayoutGrid className="text-[#67e8bd]" size={18} />
                <h2 className="text-base font-semibold">{panel.title}</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {panel.rows.map((row) => (
                  <div key={`${panel.title}-${row.label}`} className="flex flex-col justify-between gap-2 rounded border border-[#333] bg-[#202020] p-3 text-sm sm:flex-row sm:items-center">
                    <span>
                      <span className="block font-medium text-[#f4f4f4]">{row.label}</span>
                      <span className="block text-xs leading-5 text-[#aaa]">{row.meta}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 font-semibold text-white">
                      {row.value}
                      <ArrowRight size={14} className="text-[#67e8bd]" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded border border-[#333] bg-[#242424] p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="text-[#67e8bd]" size={18} />
            <h2 className="text-base font-semibold">Activity</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {page.activity.map((item) => (
              <div key={`${item.title}-${item.time}`} className="flex flex-col justify-between gap-2 rounded border border-[#333] bg-[#202020] p-3 text-sm sm:flex-row sm:items-center">
                <span className="flex items-start gap-2 text-[#d8d8d8]">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#67e8bd]" />
                  <span>
                    <span className="block font-medium">{item.title}</span>
                    <span className="block text-xs leading-5 text-[#aaa]">{item.detail}</span>
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-[#aaa]">{item.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
