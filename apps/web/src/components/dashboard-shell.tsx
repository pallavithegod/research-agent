"use client";

import {
  BarChart3,
  BookOpen,
  Box,
  BrainCircuit,
  Bug,
  CircleDollarSign,
  CreditCard,
  DatabaseZap,
  FileSearch,
  Gift,
  GitBranch,
  GitPullRequest,
  KeyRound,
  Mail,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type SidebarIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

type DashboardUser = {
  login: string;
  name: string;
  avatar_url?: string | null;
};

const demoUser: DashboardUser = {
  login: "research-admin",
  name: "Research Ops",
};

const dashboardStatus = {
  credit_balance: "$842.40",
};

const sidebar: Array<[string, string, SidebarIcon]> = [
  ["Overview", "/", Box],
  ["Projects", "/projects", Box],
  ["Bounty Board", "/bounties", Target],
  ["Issue Bounties", "/issue-bounties", Bug],
  ["Leaderboard", "/leaderboard", Trophy],
  ["Campaigns", "/campaigns", Target],
  ["Pull Requests", "/pull-requests", GitPullRequest],
  ["API Keys", "/api-keys", KeyRound],
  ["AI Tools", "/ai-tools", BrainCircuit],
  ["Playground", "/playground", Sparkles],
  ["Automations", "/workflows", GitBranch],
  ["Marketplace", "/marketplace", ShoppingCart],
  ["Rewards", "/rewards", Trophy],
  ["Usage", "/usage", BarChart3],
  ["Billing", "/billing", CreditCard],
  ["Tables", "/tables", DatabaseZap],
  ["Profile", "/profile", Users],
  ["Credit Wallet", "/credits", CreditCard],
  ["Referral", "/referral", Gift],
  ["Offers", "/offers", Gift],
  ["Sponsors", "/sponsors", Users],
  ["Notifications", "/notifications", Mail],
  ["Research Runs", "/runs", FileSearch],
  ["Task Planner", "/planner", Network],
  ["Paid APIs", "/apis", KeyRound],
  ["Payments", "/payments", CircleDollarSign],
  ["Fact Checks", "/facts", ShieldCheck],
  ["Data Enrichment", "/enrichment", DatabaseZap],
  ["Report Builder", "/reports", ReceiptText],
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#181818] text-[#f4f4f4]">
      <TopBar user={demoUser} />

      <aside className={cn("fixed bottom-0 left-0 top-12 z-40 hidden min-h-0 overflow-hidden border-r border-[#2e2e2e] bg-[#202020] transition-[width] duration-300 ease-out lg:flex", sidebarCollapsed ? "w-16" : "w-[216px]")}>
        <SidebarContent user={demoUser} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((current) => !current)} onProfile={() => setSettingsOpen(true)} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur lg:hidden">
          <aside className="h-full min-h-0 w-[min(86vw,280px)] overflow-hidden border-r border-[#2e2e2e] bg-[#202020] pt-12">
            <SidebarContent user={demoUser} collapsed={false} onToggle={() => setMobileOpen(false)} onProfile={() => setSettingsOpen(true)} />
          </aside>
        </div>
      ) : null}

      <button
        className="fixed left-3 top-2 z-[60] grid size-8 place-items-center rounded text-[#a8a8a8] hover:bg-[#2c2c2c] lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open dashboard navigation"
      >
        <Menu size={18} />
      </button>

      <main id="main" className={cn("min-h-[calc(100vh-48px)] pt-12 transition-[padding-left] duration-300 ease-out", sidebarCollapsed ? "lg:pl-16" : "lg:pl-[216px]")}>
        {children}
      </main>

      <WorkspaceSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function TopBar({ user }: { user: DashboardUser }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-12 border-b border-[#2c2c2c] bg-[#202020]">
      <div className="flex h-full items-center justify-between pl-3 pr-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="grid size-8 place-items-center rounded-lg border border-[#343434] bg-[#181818] p-1.5" aria-label="Home">
            <Image src="/artificial.png" alt="Research Agent" width={24} height={24} className="size-full object-contain" />
          </Link>
          <Link href="/" className="hidden text-sm font-semibold tracking-tight text-white sm:inline-flex">
            Research Agent
          </Link>
        </div>

        <div className="flex items-center gap-3 text-sm font-medium text-[#a9a9a9]">
          <span className="hidden items-center gap-1.5 rounded border border-[#343434] px-2 py-1 text-xs text-[#d9d9d9] md:inline-flex">
            <CircleDollarSign size={14} className="text-[#67e8bd]" />
            {dashboardStatus.credit_balance} x402 credits
          </span>
          <Link href="/notifications" className="hidden items-center gap-1.5 hover:text-white sm:inline-flex">
            <Mail size={17} />
            Notifications
          </Link>
          <Link href="/docs" className="hidden items-center gap-1.5 hover:text-white md:inline-flex">
            <BookOpen size={17} />
            Docs
          </Link>
          <span className="hidden rounded border border-[#343434] px-2 py-1 text-xs text-[#d9d9d9] sm:inline-flex">
            {user.name}
          </span>
        </div>
      </div>
    </header>
  );
}

function SidebarContent({ user, collapsed, onToggle, onProfile }: { user: DashboardUser; collapsed: boolean; onToggle: () => void; onProfile: () => void }) {
  const pathname = usePathname();
  const initials = user.login.slice(0, 2).toUpperCase();

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col pb-2 pt-3 transition-[padding] duration-300", collapsed ? "px-2" : "px-3")}>
      <nav className={cn("grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]", collapsed ? "pr-0" : "pr-1")}>
        {sidebar.map(([label, href, Icon]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const className = cn(
            "flex h-8 items-center rounded text-sm font-medium transition",
            collapsed ? "justify-center px-0" : "gap-2 px-2",
            active ? "bg-[#343434] text-white" : "text-[#a8a8a8] hover:bg-[#2b2b2b] hover:text-white",
          );
          return (
            <Link key={label} href={href} className={className} title={collapsed ? label : undefined}>
              <span className={cn("grid size-5 place-items-center", active ? "text-[#67e8bd]" : "text-current")}>
                <Icon size={18} strokeWidth={1.7} />
              </span>
              <span className={cn("truncate transition-[opacity,width] duration-200", collapsed ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100")}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-2 flex shrink-0 items-center gap-2 border-t border-[#2e2e2e] pt-2", collapsed ? "flex-col" : "")}>
        <button onClick={onProfile} title={collapsed ? user.name : undefined} className={cn("min-w-0 rounded text-sm font-medium text-[#d8d8d8] hover:bg-[#2b2b2b] hover:text-white", collapsed ? "grid size-9 place-items-center" : "flex h-9 flex-1 items-center gap-2 px-2")}>
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-[8px] font-black text-black">{initials}</span>
          <span className={cn("truncate transition-[opacity,width] duration-200", collapsed ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100")}>{user.name}</span>
        </button>
        <button onClick={onToggle} className="grid size-8 place-items-center rounded text-[#a8a8a8] hover:bg-[#2b2b2b] hover:text-white" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.7} /> : <PanelLeftClose size={16} strokeWidth={1.7} />}
        </button>
      </div>
    </div>
  );
}

function WorkspaceSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/72 p-4">
      <section className="w-full max-w-[590px] rounded-md border border-[#333] bg-[#202020] text-[#f4f4f4] shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-[#303030] px-4">
          <h2 className="text-base font-semibold">Workspace Settings</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded text-[#c9c9c9] hover:bg-[#2c2c2c]" aria-label="Close settings">
            <X size={19} />
          </button>
        </div>

        <div className="grid gap-4 p-4">
          <div className="grid gap-3 border-b border-[#333] pb-5 md:grid-cols-[190px_1fr]">
            <div>
              <p className="text-sm font-semibold">Research Workspace</p>
              <p className="mt-1 max-w-[180px] text-xs leading-4 text-[#9a9a9a]">
                Local-only shell for designing the dashboard before backend integration.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-[#d8d8d8]">
              <div className="flex items-center justify-between rounded border border-[#333] bg-[#181818] px-3 py-2">
                <span>Environment</span>
                <span className="font-mono text-xs text-[#67e8bd]">frontend mock</span>
              </div>
              <div className="flex items-center justify-between rounded border border-[#333] bg-[#181818] px-3 py-2">
                <span>Backend</span>
                <span className="font-mono text-xs text-[#aaa]">not connected</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Authentication</p>
            <p className="text-sm font-medium text-[#9a9a9a]">Disabled for local dashboard design.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
