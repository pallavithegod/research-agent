"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Database,
  FileCheck2,
  FileText,
  KeyRound,
  Mail,
  MoreHorizontal,
  Network,
  Plus,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

const dashboardStats = [
  { label: "Active runs", value: "1,600", delta: "+55%", icon: Search, featured: true },
  { label: "Paid API calls", value: "357", delta: "+124%", icon: KeyRound },
  { label: "Evidence items", value: "2,300", delta: "+15%", icon: Database },
  { label: "Citations accepted", value: "940", delta: "+90%", icon: FileCheck2 },
];

const reviewBars = [
  { label: "Citation coverage", value: "92%", width: "92%" },
  { label: "Independent verification", value: "78%", width: "78%" },
  { label: "Unsupported claims", value: "3%", width: "3%" },
];

const projectRows = [
  { name: "EV Battery Recycling", members: ["SR", "FC", "ED"], budget: "$14.00", completion: "60%" },
  { name: "Laptop Price Monitor", members: ["PL", "SE"], budget: "$3.00", completion: "10%" },
  { name: "Competitor Briefing", members: ["AN", "WR", "ED"], budget: "$8.50", completion: "78%" },
  { name: "Policy Watch", members: ["RT", "FC"], budget: "$5.25", completion: "42%" },
];

const timeline = [
  { title: "$2.40 search settlement", meta: "Today 2:25 PM", tone: "success" },
  { title: "New report #1832412", meta: "Today 2:18 PM", tone: "accent" },
  { title: "Provider payment required", meta: "Today 2:03 PM", tone: "warning" },
  { title: "Source conflict detected", meta: "Today 1:52 PM", tone: "danger" },
];

export function SoftDashboardEnhancements() {
  return (
    <>
      <section className="mt-6 grid gap-4 xl:grid-cols-[0.48fr_0.52fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {dashboardStats.map((stat) => (
            <div key={stat.label} className={`rounded border p-5 shadow-2xl ${stat.featured ? "border-[#67e8bd]/30 bg-[#67e8bd] text-[#0e100f]" : "border-[#333] bg-[#242424] text-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`grid size-12 place-items-center rounded-full ${stat.featured ? "bg-white text-[#101010]" : "bg-white text-[#101010]"}`}>
                  <stat.icon size={19} />
                </span>
                <span className={`text-sm font-bold ${stat.featured ? "text-[#0e100f]" : "text-white"}`}>{stat.delta}</span>
              </div>
              <p className="mt-6 text-2xl font-semibold">{stat.value}</p>
              <p className={`mt-1 text-sm font-medium ${stat.featured ? "text-[#13201b]" : "text-[#d8d8d8]"}`}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded border border-[#333] bg-[#242424] p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Research quality</h2>
            <button className="inline-flex h-9 items-center gap-2 rounded border border-[#3a3a3a] px-3 text-xs font-semibold text-[#d8d8d8] hover:bg-[#2b2b2b]">
              View audit
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="mt-6 grid gap-4">
            {reviewBars.map((bar) => (
              <div key={bar.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">{bar.label}</span>
                  <span className="font-mono text-xs text-[#aaa]">{bar.value}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#303030]">
                  <div className="h-full rounded-full bg-[#67e8bd]" style={{ width: bar.width }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-6 text-[#aaa]">
            Quality scoring is based on source diversity, citation coverage, verified claims, and payment receipts attached to evidence.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[0.68fr_0.32fr]">
        <div className="rounded border border-[#333] bg-[#242424] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Projects</h2>
              <p className="mt-1 text-sm text-[#aaa]">30 research steps completed this month</p>
            </div>
            <button className="grid size-8 place-items-center rounded text-[#a8a8a8] hover:bg-[#2b2b2b]">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-[#8f8f8f]">
                <tr className="border-b border-[#333]">
                  <th className="py-3 font-semibold">Workflow</th>
                  <th className="py-3 font-semibold">Agents</th>
                  <th className="py-3 font-semibold">Budget</th>
                  <th className="py-3 font-semibold">Completion</th>
                </tr>
              </thead>
              <tbody>
                {projectRows.map((row) => (
                  <tr key={row.name} className="border-b border-[#303030] last:border-0">
                    <td className="py-4 font-semibold text-white">{row.name}</td>
                    <td className="py-4">
                      <AvatarStack initials={row.members} />
                    </td>
                    <td className="py-4 font-mono text-xs text-[#d8d8d8]">{row.budget}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-10 font-mono text-xs text-[#aaa]">{row.completion}</span>
                        <div className="h-1.5 w-28 rounded-full bg-[#303030]">
                          <div className="h-full rounded-full bg-[#67e8bd]" style={{ width: row.completion }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <TimelinePanel title="Orders overview" subtitle="24% this month" items={timeline} />
      </section>
    </>
  );
}

export function BillingPageContent() {
  return (
    <PageFrame eyebrow="Billing" title="Payment controls" description="Manage x402 balances, scoped allowances, provider invoices, and payment receipts.">
      <section className="grid gap-4 xl:grid-cols-[0.68fr_0.32fr]">
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[0.52fr_0.24fr_0.24fr]">
            <PaymentCard />
            <InfoTile icon={<WalletCards size={20} />} title="Allowance" description="Daily briefing" value="+$2.00" />
            <InfoTile icon={<CircleDollarSign size={20} />} title="Pending" description="Provider prompts" value="$455.00" />
          </div>
          <PaymentMethods />
        </div>
        <Invoices />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[0.58fr_0.42fr]">
        <BillingInformation />
        <Transactions />
      </section>
    </PageFrame>
  );
}

export function TablesPageContent() {
  return (
    <PageFrame eyebrow="Tables" title="Operational tables" description="Dense research operations views for agents, provider calls, reports, and workflow status.">
      <DataTable
        title="Agents table"
        columns={["Agent", "Function", "Status", "Last run", "Action"]}
        rows={[
          ["Search Agent|search@research.local", "Discovery|Sources", "Online", "Today 2:25 PM", "Edit"],
          ["Fact Checker|claims@research.local", "Verification|Claims", "Online", "Today 2:23 PM", "Edit"],
          ["Retrieval Agent|fetch@research.local", "Retrieval|Evidence", "Offline", "Today 1:40 PM", "Edit"],
          ["Writer Agent|report@research.local", "Writing|Reports", "Online", "Today 2:18 PM", "Edit"],
          ["Editor Agent|quality@research.local", "Review|Citations", "Online", "Today 2:12 PM", "Edit"],
        ]}
      />
      <div className="mt-6">
        <DataTable
          title="Provider calls table"
          columns={["Provider", "Budget", "Status", "Completion", "Receipt"]}
          rows={[
            ["Paid Search API|web/news/scholar", "$8.32", "Paid", "92%", "rcpt_8124"],
            ["Claim Verification|independent sources", "$25.62", "Paid", "78%", "rcpt_8125"],
            ["Entity Enrichment|product and company data", "$10.80", "Running", "42%", "pending"],
            ["Report Generator|cited dossier", "$4.20", "Ready", "64%", "rcpt_8126"],
          ]}
          progressColumn={3}
        />
      </div>
    </PageFrame>
  );
}

export function ProfilePageContent() {
  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#181818] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded border border-[#333] bg-[#202020]">
        <div className="h-40 bg-[radial-gradient(circle_at_20%_10%,rgba(103,232,189,0.32),transparent_28rem),linear-gradient(135deg,#202020,#111)]" />
        <div className="flex flex-col gap-4 border-t border-[#333] p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-14 flex items-end gap-4">
            <span className="grid size-24 place-items-center rounded border border-[#333] bg-white text-2xl font-black text-black shadow-2xl">RO</span>
            <div className="pb-1">
              <h1 className="text-2xl font-semibold tracking-tight">Research Ops</h1>
              <p className="mt-1 text-sm text-[#aaa]">Planner owner / x402 policy administrator</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="mori-button mori-button-sm inline-flex">Edit profile</button>
            <button className="inline-flex h-9 items-center rounded border border-[#3a3a3a] px-3 text-sm font-semibold text-[#d8d8d8] hover:bg-[#2b2b2b]">Settings</button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <PlatformSettings />
        <ProfileInfo />
        <Conversations />
      </section>

      <section className="mt-6 rounded border border-[#333] bg-[#242424] p-5">
        <div>
          <h2 className="text-base font-semibold">Projects</h2>
          <p className="mt-1 text-sm text-[#aaa]">Research workspaces connected to this profile</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["project #1", "Market watch", "Competitor and market movement briefing with cited sources."],
            ["project #2", "Product comparison", "Shopping research, product constraints, and monitored offers."],
            ["project #3", "Policy monitor", "Recurring policy and compliance changes with trusted sources."],
          ].map(([label, title, copy]) => (
            <div key={title} className="rounded border border-[#333] bg-[#202020] p-4">
              <div className="h-28 rounded bg-[radial-gradient(circle_at_30%_20%,rgba(103,232,189,0.25),transparent_18rem),linear-gradient(135deg,#2a2a2a,#181818)]" />
              <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#8f8f8f]">{label}</p>
              <h3 className="mt-1 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#aaa]">{copy}</p>
              <button className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#67e8bd]">View project</button>
            </div>
          ))}
          <div className="grid min-h-[260px] place-items-center rounded border border-dashed border-[#3a3a3a] bg-[#202020] p-4 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full border border-[#3a3a3a] text-[#67e8bd]">
                <Plus size={20} />
              </span>
              <p className="mt-4 font-semibold">New project</p>
              <p className="mt-1 text-sm text-[#aaa]">Create a workspace for a new research goal.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PageFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#181818] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mb-6 rounded border border-[#333] bg-[#202020] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e8bd]">{eyebrow}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa]">{description}</p>
      </section>
      {children}
    </div>
  );
}

function PaymentCard() {
  return (
    <div className="relative min-h-56 overflow-hidden rounded border border-[#333] bg-[#101311] p-5 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(103,232,189,0.2),transparent_20rem),linear-gradient(135deg,rgba(255,255,255,0.08),transparent)]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <CreditCard className="text-[#67e8bd]" size={24} />
          <span className="font-mono text-xs text-[#aaa]">x402 wallet</span>
        </div>
        <p className="mt-12 font-mono text-2xl font-semibold tracking-[0.16em] text-white">4562 1122 4594 7852</p>
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#8f8f8f]">Policy owner</p>
            <p className="mt-1 font-semibold">Research Ops</p>
          </div>
          <div>
            <p className="text-[#8f8f8f]">Expires</p>
            <p className="mt-1 font-semibold">11/28</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon, title, description, value }: { icon: ReactNode; title: string; description: string; value: string }) {
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5 text-center shadow-2xl">
      <span className="mx-auto grid size-16 place-items-center rounded bg-[#67e8bd] text-[#0e100f]">{icon}</span>
      <h2 className="mt-5 font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[#aaa]">{description}</p>
      <p className="mt-8 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function PaymentMethods() {
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Payment method</h2>
        <button className="mori-button mori-button-sm inline-flex">Add new card</button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <PaymentMethodCard brand="USDC" ending="7852" />
        <PaymentMethodCard brand="VISA" ending="5248" />
      </div>
    </div>
  );
}

function PaymentMethodCard({ brand, ending }: { brand: string; ending: string }) {
  return (
    <div className="flex h-20 items-center gap-4 rounded border border-[#3a3a3a] bg-[#202020] px-4">
      <span className="grid size-10 place-items-center rounded bg-[#303030] text-xs font-black text-[#67e8bd]">{brand}</span>
      <span className="font-mono text-sm font-semibold text-white">**** **** **** {ending}</span>
    </div>
  );
}

function Invoices() {
  const invoices = [
    ["March 01, 2026", "#MS-415646", "$180"],
    ["February 10, 2026", "#RV-126749", "$250"],
    ["April 05, 2026", "#FB-212562", "$560"],
    ["June 25, 2026", "#QW-103578", "$120"],
    ["March 01, 2026", "#AR-803481", "$300"],
  ];
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Invoices</h2>
        <button className="inline-flex h-9 items-center rounded border border-[#67e8bd]/50 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#67e8bd] hover:bg-[#26352f]">View all</button>
      </div>
      <div className="mt-5 grid gap-4">
        {invoices.map(([date, id, amount]) => (
          <div key={id} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">{date}</p>
              <p className="mt-1 font-mono text-xs text-[#aaa]">{id}</p>
            </div>
            <div className="flex items-center gap-5">
              <span className="font-mono text-xs text-[#aaa]">{amount}</span>
              <button className="text-xs font-black uppercase text-white">PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingInformation() {
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <h2 className="text-base font-semibold">Billing information</h2>
      <div className="mt-5 grid gap-4">
        {["Research Ops", "Market Watch Team", "Provider Lab"].map((name) => (
          <div key={name} className="rounded border border-[#333] bg-[#202020] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-white">{name}</p>
                <div className="mt-3 grid gap-1 text-sm text-[#aaa]">
                  <p><span className="text-[#d8d8d8]">Company:</span> Multi-Step Research Agent</p>
                  <p><span className="text-[#d8d8d8]">Email:</span> ops@research.local</p>
                  <p><span className="text-[#d8d8d8]">Tax ID:</span> x402-sandbox</p>
                </div>
              </div>
              <div className="flex gap-3 text-xs font-semibold uppercase">
                <button className="text-[#ff8aa0]">Delete</button>
                <button className="text-white">Edit</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Transactions() {
  const rows = [
    ["Paid Search API", "27 March 2026, 12:30 PM", "- $2.50", "danger"],
    ["Wallet top up", "26 March 2026, 09:12 AM", "+ $200.00", "success"],
    ["Claim Verification API", "26 March 2026, 08:41 AM", "- $12.80", "danger"],
    ["Report Generator", "25 March 2026, 05:10 PM", "- $4.20", "danger"],
  ];
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Your transactions</h2>
        <span className="font-mono text-xs text-[#aaa]">23 - 30 March 2026</span>
      </div>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f8f8f]">Newest</p>
      <div className="mt-4 grid gap-4">
        {rows.map(([name, date, amount, tone]) => (
          <div key={`${name}-${date}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`grid size-8 place-items-center rounded-full border ${tone === "success" ? "border-[#67e8bd] text-[#67e8bd]" : "border-[#ff8aa0] text-[#ff8aa0]"}`}>{tone === "success" ? "+" : "-"}</span>
              <div>
                <p className="font-semibold text-white">{name}</p>
                <p className="mt-1 text-xs text-[#aaa]">{date}</p>
              </div>
            </div>
            <span className={`font-mono text-xs font-semibold ${tone === "success" ? "text-[#67e8bd]" : "text-[#ff8aa0]"}`}>{amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTable({ title, columns, rows, progressColumn }: { title: string; columns: string[]; rows: string[][]; progressColumn?: number }) {
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-[#8f8f8f]">
            <tr className="border-b border-[#333]">
              {columns.map((column) => <th key={column} className="py-3 font-semibold">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join("-")} className="border-b border-[#303030] last:border-0">
                {row.map((cell, index) => (
                  <td key={`${cell}-${index}`} className="py-4 pr-5 align-middle">
                    {index === 0 ? <IdentityCell value={cell} /> : index === 2 ? <StatusPill value={cell} /> : progressColumn === index ? <ProgressValue value={cell} /> : <span className="text-[#d8d8d8]">{cell}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IdentityCell({ value }: { value: string }) {
  const [name, meta] = value.split("|");
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded bg-[#303030] text-xs font-black text-[#67e8bd]">{name.slice(0, 2).toUpperCase()}</span>
      <span>
        <span className="block font-semibold text-white">{name}</span>
        <span className="block text-xs text-[#aaa]">{meta}</span>
      </span>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const color = normalized.includes("online") || normalized.includes("paid") || normalized.includes("ready")
    ? "border-[#67e8bd]/40 bg-[#183029] text-[#9ff6d3]"
    : normalized.includes("running")
      ? "border-[#dfdcff]/40 bg-[#2b2940] text-[#dfdcff]"
      : "border-[#555] bg-[#303030] text-[#cfcfcf]";
  return <span className={`inline-flex rounded px-2 py-1 text-[11px] font-bold uppercase ${color}`}>{value}</span>;
}

function ProgressValue({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 font-mono text-xs text-[#aaa]">{value}</span>
      <div className="h-1.5 w-28 rounded-full bg-[#303030]">
        <div className="h-full rounded-full bg-[#67e8bd]" style={{ width: value }} />
      </div>
    </div>
  );
}

function PlatformSettings() {
  const settings: Array<[string, boolean]> = [
    ["Email me payment prompts", true],
    ["Pause when budget reaches 80%", true],
    ["Allow unverified providers", false],
    ["Require citations for every report", true],
    ["Enable checkout automation", false],
  ];
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <h2 className="text-base font-semibold">Platform settings</h2>
      <div className="mt-5 grid gap-4">
        {settings.map(([label, enabled]) => (
          <label key={String(label)} className="flex items-center justify-between gap-4 text-sm text-[#d8d8d8]">
            <span>{label}</span>
            <span className={`h-5 w-9 rounded-full p-0.5 ${enabled ? "bg-[#67e8bd]" : "bg-[#3a3a3a]"}`}>
              <span className={`block size-4 rounded-full bg-white transition ${enabled ? "translate-x-4" : ""}`} />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ProfileInfo() {
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <h2 className="text-base font-semibold">Profile information</h2>
      <p className="mt-4 text-sm leading-6 text-[#aaa]">
        Owner for planner policy, provider allow-lists, payment approval scopes, and report quality gates. Responsible for keeping research workflows evidence-first and payment-safe.
      </p>
      <div className="mt-5 grid gap-2 text-sm">
        <InfoRow label="Full name" value="Research Ops" />
        <InfoRow label="Mobile" value="+1 202 555 0142" />
        <InfoRow label="Email" value="ops@research.local" />
        <InfoRow label="Location" value="Remote" />
      </div>
    </div>
  );
}

function Conversations() {
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <h2 className="text-base font-semibold">Conversations</h2>
      <div className="mt-5 grid gap-4">
        {[
          ["Planner Agent", "Need approval for a new provider."],
          ["Fact Checker", "Two market claims conflict."],
          ["Report Editor", "Draft ready for final review."],
          ["Payment Gateway", "Receipt verification completed."],
        ].map(([name, message]) => (
          <div key={name} className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded bg-[#303030] text-xs font-black text-[#67e8bd]">{name.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{name}</p>
                <p className="truncate text-xs text-[#aaa]">{message}</p>
              </div>
            </div>
            <Mail size={16} className="shrink-0 text-[#8f8f8f]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelinePanel({ title, subtitle, items }: { title: string; subtitle: string; items: Array<{ title: string; meta: string; tone: string }> }) {
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[#aaa]">{subtitle}</p>
      <div className="mt-6 grid gap-5">
        {items.map((item) => (
          <div key={item.title} className="grid grid-cols-[18px_1fr] gap-4">
            <span className={`mt-1 size-3 rounded-full ${toneClass(item.tone)}`} />
            <div>
              <p className="font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-xs text-[#aaa]">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvatarStack({ initials }: { initials: string[] }) {
  return (
    <div className="flex -space-x-2">
      {initials.map((item) => (
        <span key={item} className="grid size-7 place-items-center rounded-full border border-[#242424] bg-[#303030] text-[9px] font-black text-[#67e8bd]">{item}</span>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#aaa]">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}

function toneClass(tone: string) {
  if (tone === "success") return "bg-[#67e8bd]";
  if (tone === "warning") return "bg-[#f7b500]";
  if (tone === "danger") return "bg-[#ff8aa0]";
  return "bg-[#dfdcff]";
}
