"use client";

import { ArrowRight, CheckCircle2, CircleDollarSign, Copy, FileText, KeyRound, Network, Search, ShieldCheck, Terminal } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { ClerkApiStatus } from "@/components/clerk-api-status";
import { SoftDashboardEnhancements } from "@/components/soft-dashboard-sections";
import { useAuthenticatedApi } from "@/lib/api-client";

type DashboardPayload = {
  balance: string;
  settledSpend: string;
  pendingSpend: string;
  activeRuns: number;
  connectedApis: number;
  reportCount: number;
  recentActivity: Array<{ id: string; type: string; timeLabel: string; detail: string }>;
};

type JobRecord = {
  id: string;
  query: string;
  status: string;
  report_id?: string | null;
  created_at?: string;
};

type WorkflowTemplate = {
  id: string;
  name: string;
  nodes: string[];
};

const fallbackPayload: DashboardPayload = {
  balance: "$842.40",
  settledSpend: "$157.60",
  pendingSpend: "$24.20",
  activeRuns: 0,
  connectedApis: 0,
  reportCount: 0,
  recentActivity: [
    { id: "empty-state", type: "ready", timeLabel: "Now", detail: "Create a research job to populate live dashboard activity." },
  ],
};

const pipelineSteps = [
  ["1", "Decompose research query", "/planner"],
  ["2", "Invoke search and enrichment APIs", "/apis"],
  ["3", "Settle x402 payments automatically", "/payments"],
  ["4", "Compile cited research report", "/reports"],
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
  const [payload, setPayload] = useState<DashboardPayload>(fallbackPayload);
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("Compare 24 GB RAM laptops under $1,500 and cite the best three.");
  const [maxSpend, setMaxSpend] = useState("5.00");
  const [createStatus, setCreateStatus] = useState<"idle" | "submitting" | "created" | "error">("idle");
  const [createMessage, setCreateMessage] = useState("");
  const apiFetch = useAuthenticatedApi();

  async function loadDashboardData(shouldApply = () => true) {
    setDataStatus("loading");
    try {
      const [meResponse, jobsResponse, workflowsResponse] = await Promise.all([
        apiFetch("/v1/auth/me"),
        apiFetch("/v1/jobs"),
        apiFetch("/v1/workflows"),
      ]);

      if (!meResponse.ok || !jobsResponse.ok || !workflowsResponse.ok) {
        throw new Error("Dashboard API request failed");
      }

      const jobsPayload = (await jobsResponse.json()) as { data: JobRecord[] };
      const workflowsPayload = (await workflowsResponse.json()) as { data: WorkflowTemplate[] };
      const jobs = jobsPayload.data ?? [];
      const workflows = workflowsPayload.data ?? [];

      if (!shouldApply()) return;

      setPayload({
        ...fallbackPayload,
        activeRuns: countActiveRuns(jobs),
        connectedApis: countConnectedServices(workflows),
        reportCount: jobs.filter((job) => job.report_id || job.status === "succeeded").length,
        recentActivity: buildRecentActivity(jobs),
      });
      setDataStatus("ready");
    } catch {
      if (!shouldApply()) {
        return;
      }
      setPayload(fallbackPayload);
      setDataStatus("error");
    }
  }

  useEffect(() => {
    let active = true;

    void loadDashboardData(() => active);

    return () => {
      active = false;
    };
  }, [apiFetch]);

  async function createResearchJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuery = query.trim();
    const cleanSpend = maxSpend.trim();

    if (cleanQuery.length < 4) {
      setCreateStatus("error");
      setCreateMessage("Enter a research question with at least 4 characters.");
      return;
    }

    setCreateStatus("submitting");
    setCreateMessage("");

    try {
      const response = await apiFetch("/v1/jobs", {
        method: "POST",
        body: JSON.stringify({
          query: cleanQuery,
          locale: "en-US",
          trusted_sources: [],
          output_format: "markdown",
          max_spend: {
            amount: cleanSpend || "5.00",
            asset: "USDC",
            network: "base-sepolia",
          },
          require_citations: true,
          template: "product_research",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `API returned ${response.status}`);
      }

      const result = (await response.json()) as { job?: JobRecord };
      setCreateStatus("created");
      setCreateMessage(result.job ? `Created job ${result.job.id}` : "Research job created.");
      await loadDashboardData();
    } catch (error) {
      setCreateStatus("error");
      setCreateMessage(error instanceof Error ? error.message : "Could not create research job.");
    }
  }

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
            <a href="/planner" className="mori-button mori-button-sm inline-flex items-center gap-2">
              <Network size={16} />
              Plan research run
            </a>
            <a href="/apis" className="inline-flex h-9 items-center gap-2 rounded border border-[#3a3a3a] px-3 text-sm font-semibold text-[#d8d8d8] hover:bg-[#2b2b2b]">
              <KeyRound size={16} />
              Connect paid API
            </a>
          </div>
        </section>

        <ClerkApiStatus />

        <section className="mt-6 rounded border border-[#333] bg-[#242424] p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e8bd]">New research run</p>
              <h2 className="mt-2 text-base font-semibold text-white">Create a planned backend job</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaa]">
                This submits a real `POST /v1/jobs` request. The backend creates a research plan and the overview refreshes from live job data.
              </p>
            </div>
            <span className="rounded border border-[#343434] px-3 py-1 text-xs font-semibold text-[#aaa]">
              x402 sandbox budget
            </span>
          </div>

          <form onSubmit={createResearchJob} className="mt-5 grid gap-3 xl:grid-cols-[1fr_140px_auto]">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f8f8f]">Research query</span>
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                rows={3}
                className="min-h-24 resize-none rounded border border-[#3a3a3a] bg-[#181818] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-[#67e8bd]"
                placeholder="Ask a research question..."
              />
            </label>
            <label className="grid content-start gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f8f8f]">Max spend</span>
              <input
                value={maxSpend}
                onChange={(event) => setMaxSpend(event.target.value)}
                inputMode="decimal"
                className="h-11 rounded border border-[#3a3a3a] bg-[#181818] px-3 font-mono text-sm text-white outline-none transition focus:border-[#67e8bd]"
                placeholder="5.00"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={createStatus === "submitting"}
                className="mori-button mori-button-sm inline-flex h-11 w-full items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
              >
                <Network size={16} />
                {createStatus === "submitting" ? "Creating..." : "Create job"}
              </button>
            </div>
          </form>

          {createMessage ? (
            <p className={`mt-4 rounded border px-3 py-2 text-sm ${createStatus === "error" ? "border-[#5d3939] bg-[#2a1f1f] text-[#ffb6b6]" : "border-[#67e8bd]/40 bg-[#183029] text-[#9ff6d3]"}`}>
              {createMessage}
            </p>
          ) : null}
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
            <DataStatus status={dataStatus} />
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
            <DataStatus status={dataStatus} />
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
          <MetricCard icon={<FileText size={18} />} label="Report formats" value={payload.reportCount.toString()} copy="Compiled reports returned by the backend job API." />
        </section>

        <SoftDashboardEnhancements />

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

function DataStatus({ status }: { status: "loading" | "ready" | "error" }) {
  const label = status === "ready" ? "Live API data" : status === "loading" ? "Loading API data" : "Using fallback data";
  const className = status === "ready" ? "text-[#67e8bd]" : status === "loading" ? "text-[#aaa]" : "text-[#f7b500]";

  return <p className={`mt-5 text-xs font-semibold uppercase tracking-[0.14em] ${className}`}>{label}</p>;
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

function countActiveRuns(jobs: JobRecord[]) {
  const terminal = new Set(["succeeded", "failed", "cancelled", "budget_exhausted"]);
  return jobs.filter((job) => !terminal.has(job.status)).length;
}

function countConnectedServices(workflows: WorkflowTemplate[]) {
  const providerNodes = new Set(["search", "retrieval", "fact_checking", "payment_x402", "report", "product_search"]);
  const connected = new Set<string>();
  workflows.forEach((workflow) => {
    workflow.nodes.forEach((node) => {
      if (providerNodes.has(node)) {
        connected.add(node);
      }
    });
  });
  return connected.size;
}

function buildRecentActivity(jobs: JobRecord[]): DashboardPayload["recentActivity"] {
  if (jobs.length === 0) {
    return fallbackPayload.recentActivity;
  }

  return jobs
    .slice()
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 3)
    .map((job) => ({
      id: job.id,
      type: `job_${job.status}`,
      timeLabel: formatTimestamp(job.created_at),
      detail: job.query,
    }));
}

function formatTimestamp(value?: string) {
  if (!value) return "No timestamp";
  return value.replace("T", " ").replace(/\.\d+Z?$/, " UTC").replace("+00:00", " UTC").slice(0, 19);
}
