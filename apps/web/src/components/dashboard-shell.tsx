"use client";

import {
  Bell,
  ChevronDown,
  Glasses,
  Hexagon,
  Library,
  Menu,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthenticatedApi } from "@/lib/api-client";

const primaryNavigation = [
  ["Computer", "/runs", Monitor],
  ["Artifacts", "/reports", Library],
  ["Customize", "/profile", Hexagon],
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#141413] text-[#ededeb]">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.055] bg-[#1b1b1a] transition-[width] duration-200 lg:block", collapsed ? "w-[58px]" : "w-[218px]")}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[min(82vw,250px)] border-r border-white/[0.06] bg-[#1b1b1a]" onClick={(event) => event.stopPropagation()}>
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <header className={cn("pointer-events-none fixed inset-x-0 top-0 z-30 flex h-14 items-center px-3 transition-[padding-left] duration-200", collapsed ? "lg:pl-[70px]" : "lg:pl-[230px]")}>
        <button className="pointer-events-auto grid size-8 place-items-center rounded-lg border border-white/[0.08] bg-[#191918] text-[#aaa] lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={17}/></button>
        <div className="pointer-events-auto ml-auto flex items-center gap-2">
          <button aria-label="Private mode" className="grid size-8 place-items-center rounded-lg border border-white/[0.09] bg-[#191918] text-[#aaa] transition hover:bg-[#222221] hover:text-white"><Glasses size={16}/></button>
          <button aria-label="Open menu" className="grid size-8 place-items-center rounded-lg border border-white/[0.09] bg-[#191918] text-[#aaa] transition hover:bg-[#222221] hover:text-white"><Menu size={16}/></button>
        </div>
      </header>

      <main className={cn("min-h-screen transition-[padding-left] duration-200", collapsed ? "lg:pl-[58px]" : "lg:pl-[218px]")}>{children}</main>
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const [selectedJobId, setSelectedJobId] = useState("");
  const apiFetch = useAuthenticatedApi();
  const [sessions, setSessions] = useState<Array<{ id: string; query: string }>>([]);
  useEffect(() => {
    let active = true;
    void apiFetch("/v1/jobs").then(async (response) => {
      if (!response.ok || !active) return;
      const body = await response.json() as { data?: Array<{ id: string; query: string; created_at: string }> };
      const items = [...(body.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
      if (active) setSessions(items.slice(0, 12));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [apiFetch]);
  useEffect(() => {
    setSelectedJobId(new URLSearchParams(window.location.search).get("job") ?? "");
  }, [pathname]);
  return (
    <div className={cn("flex h-full flex-col overflow-hidden px-2.5 py-2.5", collapsed && "items-center px-2")}>
      <div className={cn("flex h-8 w-full items-center", collapsed ? "justify-center" : "justify-between px-1")}>
        <Link href="/" className="grid size-7 place-items-center text-[#d7d7d5]" aria-label="Arc home"><Sparkles size={19} strokeWidth={1.5}/></Link>
        {!collapsed ? <button onClick={onToggle} className="grid size-7 place-items-center rounded-md text-[#8e8e8c] hover:bg-white/[0.06] hover:text-white" aria-label="Collapse sidebar"><PanelLeftClose size={16}/></button> : null}
      </div>

      <a href="/" className={cn("mt-2.5 flex h-9 w-full items-center rounded-xl bg-white/[0.045] text-[13px] font-medium text-[#e6e6e3] hover:bg-white/[0.07]", collapsed ? "justify-center" : "gap-2.5 px-2.5")} title={collapsed ? "New" : undefined}>
        <Plus size={17}/>{!collapsed ? "New" : null}
      </a>

      <nav className="mt-1.5 grid w-full gap-0.5">
        {primaryNavigation.map(([label, href, Icon]) => {
          const active = pathname.startsWith(href);
          return <Link key={label} href={href} title={collapsed ? label : undefined} className={cn("flex h-9 items-center rounded-md border text-[13px] transition", collapsed ? "justify-center" : "gap-2.5 px-2.5", active ? "border-white/[0.11] bg-[#292927] text-white shadow-[inset_2px_0_0_#b5a2ee]" : "border-transparent text-[#c2c2bf] hover:border-white/[0.07] hover:bg-white/[0.045] hover:text-white")}><Icon size={16} strokeWidth={1.6}/>{!collapsed ? label : null}</Link>;
        })}
      </nav>

      {!collapsed ? (
        <div className="scrollbar-none mt-4 min-h-0 flex-1 overflow-y-auto">
          <SidebarSection title="Sessions">
            {sessions.map((session) => <a key={session.id} href={`/?job=${session.id}`} onClick={() => setSelectedJobId(session.id)} className={cn("block h-8 truncate rounded-md border px-2 leading-[30px] text-[12.5px] transition", selectedJobId === session.id ? "border-white/[0.1] bg-[#292927] text-white shadow-[inset_2px_0_0_#b5a2ee]" : "border-transparent text-[#b8b8b5] hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white")}>{session.query}</a>)}
            {!sessions.length ? <p className="px-1.5 py-2 text-[11.5px] text-[#70706d]">No research history yet</p> : null}
          </SidebarSection>
        </div>
      ) : <div className="flex-1"/>}

      <div className={cn("mt-2 flex w-full items-center border-t border-white/[0.06] pt-3", collapsed ? "justify-center" : "gap-2.5 px-1")}>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#76706a] to-[#31302e] text-[10px] font-semibold text-white">RA</span>
        {!collapsed ? <><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium text-[#dededb]">Local workspace</span><span className="block text-[10px] text-[#888885]">Anonymous mode</span></span><button className="relative grid size-7 place-items-center text-[#90908d] hover:text-white" aria-label="Notifications"><Bell size={15}/></button></> : null}
      </div>
      {collapsed ? <button onClick={onToggle} aria-label="Expand sidebar" className="mt-2 grid size-8 place-items-center rounded-lg text-[#92928f] hover:bg-white/[0.05]"><PanelLeftOpen size={16}/></button> : null}
    </div>
  );
}

function SidebarSection({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return <section className={className}><div className="mb-1 flex h-7 items-center justify-between px-1.5 text-[11.5px] text-[#7f7f7c]"><span>{title}</span><ChevronDown size={13}/></div><div className="grid">{children}</div></section>;
}
