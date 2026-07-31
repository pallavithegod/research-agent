"use client";

import { ArrowRight, CheckCircle2, CircleDollarSign, Copy, FileText, KeyRound, Network, Search, ShieldCheck, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

type DashboardPayload = {
  balance: string;
  settledSpend: string;
  pendingSpend: string;
  activeRuns: number;
  connectedApis: number;
  reportCount: number;
  recentActivity: Array<{ id: string; type: string; timeLabel: string; detail: string }>;
};

const payload: DashboardPayload = {
  balance: "$842.40",
  settledSpend: "$157.60",
  pendingSpend: "$24.20",
  activeRuns: 6,
  connectedApis: 8,
  reportCount: 31,
  recentActivity: [
    { id: "act-1", type: "search_completed", timeLabel: "Jul 31, 2026, 2:25 PM", detail: "Primary web and scholar search completed for battery recycling query." },
    { id: "act-2", type: "payment_settled", timeLabel: "Jul 31, 2026, 2:23 PM", detail: "x402 settlement cleared for fact-checking API." },
    { id: "act-3", type: "report_compiled", timeLabel: "Jul 31, 2026, 2:18 PM", detail: "Cited briefing generated with 18 source references." },
  ],
};

const pipelineSteps = [
  ["1", "Decompose research query", "#planner"],
  ["2", "Invoke search and enrichment APIs", "#apis"],
  ["3", "Settle x402 payments automatically", "#payments"],
  ["4", "Compile cited research report", "#reports"],
];

const agentConfig = `agent = "multi-step-research"
payment_protocol = "x402"
settlement_mode = "automatic"

[services]
search = "paid-search-api"
summarization = "llm-summary-api"
fact_checking = "claim-verification-api"
enrichment = "entity-data-api"
reporting = "cited-report-generator"`;

const runExample = `research-agent run ^
  --query "Analyze the 2026 EV battery recycling market" ^
  --budget-usd 12 ^
  --require-citations true`;

const reportExample = `{
  "query": "EV battery recycling market",
  "status": "completed",
  "steps": 7,
  "x402_spend_usd": 8.42,
  "citations": 18,
  "report_url": "/reports/ev-battery-recycling"
}`;

export function DashboardOverview() {
  const [copied, setCopied] = useState("");

  return (
    <div id="overview" className="min-h-[calc(100vh-48px)] bg-[#181818] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="w-full">
        <section className="rounded border border-[#333] bg-[#202020] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e8bd]">Multi-Step Research Agent</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Orchestrate paid research workflows.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa]">
            Decompose a research query into specialist tasks, invoke x402-enabled APIs, settle payments, and compile one cited report.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#planner" className="mori-button mori-button-sm inline-flex items-center gap-2">
              <Network size={16} />
              Plan research run
            </a>
            <a href="#apis" className="inline-flex h-9 items-center gap-2 rounded border border-[#3a3a3a] px-3 text-sm font-semibold text-[#d8d8d8] hover:bg-[#2b2b2b]">
              <KeyRound size={16} />
              Connect paid API
            </a>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded border border-[#333] bg-[#242424] p-5">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="text-[#67e8bd]" size={20} />
              <h2 className="text-base font-semibold">x402 balance</h2>
            </div>
            <p className="mt-8 text-3xl font-semibold">{payload.balance} <span className="text-sm text-[#aaa]">available</span></p>
            <div className="mt-5 grid gap-2 text-sm text-[#aaa]">
              <Row label="Settled API spend" value={payload.settledSpend} />
              <Row label="Pending settlements" value={payload.pendingSpend} />
              <Row label="Connected paid APIs" value={payload.connectedApis.toString()} />
            </div>
          </div>

          <div className="rounded border border-[#333] bg-[#242424] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#67e8bd]" size={20} />
              <h2 className="text-base font-semibold">Research operations</h2>
            </div>
            <p className="mt-8 text-xl font-semibold">Autonomous orchestration active</p>
            <div className="mt-5 grid gap-2 text-sm text-[#aaa]">
              <Row label="Active research runs" value={payload.activeRuns.toString()} />
              <Row label="Reports compiled" value={payload.reportCount.toString()} />
              <Row label="Citation policy" value="Required" />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
          <div className="rounded border border-[#333] bg-[#242424] p-5">
            <h2 className="text-base font-semibold">Research pipeline</h2>
            <div className="mt-5 grid gap-3">
              {pipelineSteps.map(([step, label, href]) => (
                <a key={step} href={href} className="flex items-center justify-between rounded border border-[#333] bg-[#202020] p-3 text-sm text-[#d8d8d8] hover:bg-[#292929]">
                  <span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded bg-[#303030] text-xs font-semibold text-[#67e8bd]">{step}</span>{label}</span>
                  <ArrowRight size={15} />
                </a>
              ))}
            </div>
          </div>

          <div className="rounded border border-[#333] bg-[#242424] p-5">
            <h2 className="text-base font-semibold">Recent activity</h2>
            <div className="mt-5 grid gap-3">
              {payload.recentActivity.map((activity) => (
                <div key={activity.id} className="flex flex-col justify-between gap-2 rounded border border-[#333] bg-[#202020] p-3 text-sm sm:flex-row sm:items-center">
                  <span className="flex items-start gap-2 text-[#d8d8d8]">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#67e8bd]" />
                    <span>
                      <span className="block font-medium">{formatActivity(activity.type)}</span>
                      <span className="block text-xs leading-5 text-[#aaa]">{activity.detail}</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-[#aaa]">{activity.timeLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <MetricCard icon={<Search size={18} />} label="Search services" value="3" copy="Web, academic, and news connectors ready." />
          <MetricCard icon={<ShieldCheck size={18} />} label="Fact-checkers" value="2" copy="Claim verification and source scoring." />
          <MetricCard icon={<FileText size={18} />} label="Report formats" value="4" copy="Briefing, memo, table, and cited dossier." />
        </section>

        <AgentPromptPanel copied={copied} onCopy={setCopied} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}

function MetricCard({ icon, label, value, copy }: { icon: ReactNode; label: string; value: string; copy: string }) {
  return (
    <div className="rounded border border-[#333] bg-[#242424] p-5">
      <div className="flex items-center gap-2 text-[#67e8bd]">
        {icon}
        <h2 className="text-base font-semibold text-white">{label}</h2>
      </div>
      <p className="mt-6 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#aaa]">{copy}</p>
    </div>
  );
}

function AgentPromptPanel({ copied, onCopy }: { copied: string; onCopy: (value: string) => void }) {
  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    onCopy(label);
    window.setTimeout(() => onCopy(""), 1500);
  }

  return (
    <section className="mt-6 rounded-md border border-[#343434] bg-[#181818] p-3 shadow-2xl">
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-[#67e8bd]" />
          <h2 className="text-sm font-semibold">Research agent integration preview</h2>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Snippet title="agent.toml" value={agentConfig} copied={copied === "config"} onCopy={() => copy("config", agentConfig)} />
        <Snippet title="Windows PowerShell" value={runExample} copied={copied === "powershell"} onCopy={() => copy("powershell", runExample)} />
      </div>

      <div className="mt-3">
        <Snippet title="Run response" value={reportExample} copied={copied === "response"} onCopy={() => copy("response", reportExample)} />
      </div>
    </section>
  );
}

function Snippet({ title, value, copied, onCopy }: { title: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="rounded border border-[#303030] bg-[#202020]">
      <div className="flex items-center justify-between border-b border-[#303030] px-3 py-2">
        <p className="text-xs font-semibold text-[#cfcfcf]">{title}</p>
        <button onClick={onCopy} className="mori-button mori-button-sm inline-flex items-center gap-1.5">
          <Copy size={16} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-5 text-[#cfcfcf]">{value}</pre>
    </div>
  );
}

function formatActivity(type: string) {
  return type.replaceAll("_", " ");
}
