"use client";

import {
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  DatabaseZap,
  FileSearch,
  FileText,
  Gauge,
  Globe2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Network,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useAuthenticatedApi } from "@/lib/api-client";

type JobRecord = {
  id: string;
  query: string;
  status: string;
  report_id?: string | null;
};

type JobDetailResponse = {
  job: JobRecord;
  report?: ReportRecord | null;
};

type ReportRecord = {
  id: string;
  title: string;
  summary: string;
  markdown: string;
  limitations?: string[];
  citations?: Array<{ id: string; claim: string; confidence: number }>;
};

type RunEvent = {
  type: string;
  message: string;
};

const thinkingSteps = [
  {
    icon: BrainCircuit,
    label: "Planning",
    title: "Break the request into research work",
    detail: "Identify comparison dimensions, freshness needs, source classes, and claims that need independent verification.",
    state: "complete",
  },
  {
    icon: Search,
    label: "Search",
    title: "Query paid search and retrieval APIs",
    detail: "Route to web, product, academic, or news providers based on the task plan and spend policy.",
    state: "active",
  },
  {
    icon: DatabaseZap,
    label: "Enrich",
    title: "Normalize structured evidence",
    detail: "Extract entities, prices, timestamps, specifications, source snippets, and provider receipts.",
    state: "queued",
  },
  {
    icon: ShieldCheck,
    label: "Verify",
    title: "Fact-check important claims",
    detail: "Compare claims against independent sources, flag conflicts, and keep uncertainty visible in the report.",
    state: "queued",
  },
  {
    icon: FileText,
    label: "Report",
    title: "Compile a cited answer",
    detail: "Generate a concise report with source-backed claims, limitations, and x402 payment evidence.",
    state: "queued",
  },
] as const;

const demoSources = [
  {
    title: "Provider search result",
    domain: "paid-search.api",
    tag: "web + news",
    score: "94",
    detail: "Fresh source candidate with timestamp, author metadata, and payable retrieval terms.",
  },
  {
    title: "Entity enrichment result",
    domain: "entity-data.api",
    tag: "structured",
    score: "89",
    detail: "Extracted company, product, and market attributes ready for schema validation.",
  },
  {
    title: "Claim verification result",
    domain: "claim-check.api",
    tag: "fact-check",
    score: "91",
    detail: "Independent support found for a key claim, with one competing source marked for review.",
  },
] as const;

const evidenceItems = [
  ["Source diversity", "5 provider classes", "Search, retrieval, enrichment, fact-checking, report generation."],
  ["Payment trail", "x402 receipts", "Every paid call keeps amount, provider, resource, and settlement status."],
  ["Safety policy", "Approvals first", "New providers and budget changes require explicit user approval."],
  ["Report quality", "Citations required", "Unsupported claims stay out of the final answer."],
] as const;

const promptChips = [
  "Compare AI search APIs for enterprise research",
  "Find the best 2026 laptop for ML coursework",
  "Track EV battery recycling market signals",
  "Build a competitor pricing brief with citations",
] as const;

const fallbackReport: ReportRecord = {
  id: "demo-report",
  title: "Research run preview",
  summary: "Submit a query to create a live backend job. Until then, this panel shows the final-report shape your demo will present.",
  markdown:
    "## Answer preview\n\nThe report will summarize the strongest findings first, then show why each recommendation is supported.\n\n### Evidence model\n- Search results become cited source cards.\n- Paid API calls attach x402 receipts.\n- Fact checks label confidence and uncertainty.\n- The final report lists limitations instead of hiding them.",
  limitations: ["Demo data is shown until the API returns a generated report."],
  citations: [
    { id: "C1", claim: "Reports require cited evidence.", confidence: 0.96 },
    { id: "C2", claim: "Paid calls keep settlement metadata.", confidence: 0.93 },
  ],
};

export function ResearchAgentStudio() {
  const [query, setQuery] = useState("Compare 24 GB RAM laptops under $1,500 for software engineering students. Prioritize battery life, warranty, and Linux compatibility.");
  const [maxSpend, setMaxSpend] = useState("5.00");
  const [mode, setMode] = useState("Product research");
  const [status, setStatus] = useState<"idle" | "submitting" | "running" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [job, setJob] = useState<JobRecord | null>(null);
  const [report, setReport] = useState<ReportRecord>(fallbackReport);
  const apiFetch = useAuthenticatedApi();

  async function submitResearchRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuery = query.trim();
    const cleanSpend = maxSpend.trim() || "5.00";

    if (cleanQuery.length < 10) {
      setStatus("error");
      setMessage("Enter a more specific research question before starting a run.");
      return;
    }

    setStatus("submitting");
    setMessage("Creating a backend research job...");
    setEvents([{ type: "intake", message: "Captured query, output format, spend cap, and citation policy." }]);
    setJob(null);

    try {
      const createResponse = await apiFetch("/v1/jobs", {
        method: "POST",
        body: JSON.stringify({
          query: cleanQuery,
          locale: "en-US",
          trusted_sources: [],
          output_format: "markdown",
          max_spend: {
            amount: cleanSpend,
            asset: "USDC",
            network: "base-sepolia",
          },
          require_citations: true,
          template: templateForMode(mode),
        }),
      });

      if (!createResponse.ok) {
        throw new Error(await readableError(createResponse, "Could not create the research job."));
      }

      const createPayload = (await createResponse.json()) as { job?: JobRecord };
      if (!createPayload.job) {
        throw new Error("The API did not return a created job.");
      }

      setJob(createPayload.job);
      setStatus("running");
      setMessage("Job created. Starting orchestration...");
      setEvents((current) => [...current, { type: "job_created", message: "Planner accepted the request and prepared the first workflow checkpoint." }]);

      const runResponse = await apiFetch(`/v1/jobs/${createPayload.job.id}/run`, { method: "POST" });
      if (!runResponse.ok) {
        throw new Error(await readableError(runResponse, "Could not start the research run."));
      }

      await collectEvents(createPayload.job.id);

      const detailResponse = await apiFetch(`/v1/jobs/${createPayload.job.id}`);
      if (!detailResponse.ok) {
        throw new Error(await readableError(detailResponse, "Could not load the completed job."));
      }

      const detail = (await detailResponse.json()) as JobDetailResponse;
      setJob(detail.job);

      if (detail.job.report_id) {
        const reportResponse = await apiFetch(`/v1/reports/${detail.job.report_id}`);
        if (!reportResponse.ok) {
          throw new Error(await readableError(reportResponse, "Could not load the generated report."));
        }
        const reportPayload = (await reportResponse.json()) as { report?: ReportRecord };
        if (reportPayload.report) {
          setReport(reportPayload.report);
        }
      } else if (detail.report) {
        setReport(detail.report);
      }

      setStatus("complete");
      setMessage("Research run complete. The report preview has been refreshed.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The research run could not be completed.");
    }
  }

  async function collectEvents(jobId: string) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1700);

    try {
      const response = await apiFetch(`/v1/jobs/${jobId}/events`, {
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      const streamed: RunEvent[] = [];

      while (streamed.length < 8) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const type = chunk.match(/^event:\s*(.+)$/m)?.[1] ?? "event";
          const data = chunk.match(/^data:\s*(.+)$/m)?.[1];
          if (!data) continue;
          streamed.push({ type, message: parseEventMessage(data, type) });
        }

        if (streamed.length >= 4) break;
      }

      if (streamed.length > 0) {
        setEvents((current) => [...current, ...streamed]);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setEvents((current) => [...current, { type: "event_stream", message: "Event stream was unavailable, so the UI continued with job polling." }]);
      }
    } finally {
      window.clearTimeout(timeout);
      controller.abort();
    }
  }

  const isBusy = status === "submitting" || status === "running";
  const visibleEvents = events.length > 0 ? events : [{ type: "ready", message: "Ask a question to watch the planner, paid API calls, verification, and report generation unfold." }];

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#181818] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded border border-[#333] bg-[#202020]">
          <div className="border-b border-[#303030] bg-[radial-gradient(circle_at_14%_0%,rgba(103,232,189,0.18),transparent_30rem),linear-gradient(180deg,#242424,#202020)] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
              <div className="max-w-4xl">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#67e8bd]">
                  <Sparkles size={15} />
                  Research Studio
                </p>
                <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Ask once. Watch the agent plan, pay, verify, and cite.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-[#b9b9b9]">
                  A demo-first interface for the multi-step research agent: Perplexity-style query intake, visible orchestration reasoning, paid service calls, evidence cards, and a final cited report.
                </p>
              </div>
              <div className="grid min-w-[240px] gap-2 rounded border border-[#343434] bg-[#181818]/80 p-3 text-sm">
                <StatusLine icon={<LockKeyhole size={15} />} label="Auth" value="Clerk JWT" />
                <StatusLine icon={<CircleDollarSign size={15} />} label="Payments" value="x402 scoped" />
                <StatusLine icon={<ShieldCheck size={15} />} label="Policy" value="No silent spend" />
              </div>
            </div>

            <form onSubmit={submitResearchRun} className="mt-7 rounded-md border border-[#3a3a3a] bg-[#181818] p-3 shadow-2xl">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                rows={4}
                className="min-h-28 w-full resize-none bg-transparent px-1 py-1 text-base leading-7 text-white outline-none placeholder:text-[#777]"
                placeholder="Ask the research agent anything that needs search, verification, enrichment, and citations..."
              />
              <div className="flex flex-col gap-3 border-t border-[#303030] pt-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {["Market research", "Product research", "Policy watch"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMode(item)}
                      className={`h-8 rounded border px-3 text-xs font-semibold transition ${mode === item ? "border-[#67e8bd]/60 bg-[#183029] text-[#9ff6d3]" : "border-[#343434] text-[#aaa] hover:bg-[#242424] hover:text-white"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex h-10 items-center gap-2 rounded border border-[#343434] bg-[#202020] px-3">
                    <WalletCards size={16} className="text-[#67e8bd]" />
                    <span className="text-xs text-[#888]">Max</span>
                    <input
                      value={maxSpend}
                      onChange={(event) => setMaxSpend(event.target.value)}
                      inputMode="decimal"
                      className="w-16 bg-transparent font-mono text-sm text-white outline-none"
                      aria-label="Maximum spend"
                    />
                    <span className="text-xs text-[#888]">USDC</span>
                  </label>
                  <button type="submit" disabled={isBusy} className="mori-button mori-button-sm inline-flex h-10 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                    {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {isBusy ? "Researching" : "New research run"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {promptChips.map((prompt) => (
                <button key={prompt} onClick={() => setQuery(prompt)} className="rounded border border-[#343434] bg-[#202020]/80 px-3 py-1.5 text-xs text-[#aaa] hover:border-[#4a4a4a] hover:text-white">
                  {prompt}
                </button>
              ))}
            </div>

            {message ? (
              <p className={`mt-4 rounded border px-3 py-2 text-sm ${status === "error" ? "border-[#5d3939] bg-[#2a1f1f] text-[#ffb6b6]" : "border-[#67e8bd]/35 bg-[#183029] text-[#9ff6d3]"}`}>
                {message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-0 xl:grid-cols-[0.47fr_0.53fr]">
            <div className="border-b border-[#303030] p-5 xl:border-b-0 xl:border-r">
              <SectionHeader icon={<BrainCircuit size={18} />} title="Visible Research Thinking" action="Live plan" />
              <div className="mt-5 grid gap-3">
                {thinkingSteps.map((step, index) => (
                  <ThinkingStep key={step.label} index={index + 1} {...step} />
                ))}
              </div>
              <div className="mt-5 rounded border border-[#333] bg-[#181818] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Run events</h3>
                  <span className="rounded border border-[#343434] px-2 py-1 font-mono text-[11px] text-[#aaa]">{job ? "backend" : "demo"}</span>
                </div>
                <div className="mt-4 grid gap-3">
                  {visibleEvents.map((event, index) => (
                    <div key={`${event.type}-${index}`} className="grid grid-cols-[22px_1fr] gap-3 text-sm">
                      <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-[#26352f] text-[#67e8bd]">
                        <CheckCircle2 size={13} />
                      </span>
                      <span>
                        <span className="block font-medium capitalize text-white">{formatEventName(event.type)}</span>
                        <span className="block text-xs leading-5 text-[#aaa]">{event.message}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5">
              <SectionHeader icon={<Globe2 size={18} />} title="Search Results and Evidence" action="Ranked" />
              <div className="mt-5 grid gap-3">
                {demoSources.map((source) => (
                  <SourceResult key={source.title} {...source} />
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {evidenceItems.map(([title, value, detail]) => (
                  <div key={title} className="rounded border border-[#333] bg-[#181818] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f8f8f]">{title}</p>
                    <p className="mt-3 text-lg font-semibold text-white">{value}</p>
                    <p className="mt-2 text-xs leading-5 text-[#aaa]">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="grid gap-5 content-start">
          <ReportPreview report={report} status={status} />
          <PaymentPanel maxSpend={maxSpend} />
          <ArchitecturePanel />
        </aside>
      </div>
    </div>
  );
}

function ThinkingStep({ icon: Icon, label, title, detail, state, index }: (typeof thinkingSteps)[number] & { index: number }) {
  const tone = state === "complete" ? "border-[#67e8bd]/45 bg-[#183029] text-[#9ff6d3]" : state === "active" ? "border-[#dfdcff]/35 bg-[#272638] text-[#dfdcff]" : "border-[#343434] bg-[#181818] text-[#aaa]";

  return (
    <div className={`rounded border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded bg-[#202020] text-[#67e8bd]">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-[#8f8f8f]">0{index}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
          <p className="mt-2 text-xs leading-5 text-[#aaa]">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function SourceResult({ title, domain, tag, score, detail }: { title: string; domain: string; tag: string; score: string; detail: string }) {
  return (
    <article className="rounded border border-[#333] bg-[#181818] p-4 transition hover:border-[#4a4a4a]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[#26352f] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ff6d3]">{tag}</span>
            <span className="font-mono text-xs text-[#8f8f8f]">{domain}</span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
          <p className="mt-2 text-xs leading-5 text-[#aaa]">{detail}</p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded border border-[#343434] bg-[#202020] font-mono text-sm font-semibold text-[#67e8bd]">{score}</span>
      </div>
    </article>
  );
}

function ReportPreview({ report, status }: { report: ReportRecord; status: string }) {
  return (
    <section className="rounded border border-[#333] bg-[#202020] p-5">
      <SectionHeader icon={<BookOpenCheck size={18} />} title="Cited Report" action={status === "complete" ? "Updated" : "Preview"} />
      <div className="mt-5 rounded border border-[#333] bg-[#181818] p-4">
        <p className="text-base font-semibold text-white">{report.title}</p>
        <p className="mt-2 text-sm leading-6 text-[#aaa]">{report.summary}</p>
        <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-[#303030] bg-[#111] p-3 font-mono text-xs leading-5 text-[#cfcfcf]">{report.markdown}</pre>
        <div className="mt-4 grid gap-2">
          {(report.citations ?? []).slice(0, 3).map((citation) => (
            <div key={citation.id} className="flex items-start gap-2 rounded border border-[#303030] bg-[#202020] p-3 text-xs">
              <BadgeCheck size={14} className="mt-0.5 shrink-0 text-[#67e8bd]" />
              <span>
                <span className="block text-white">{citation.claim}</span>
                <span className="mt-1 block font-mono text-[#aaa]">confidence {Math.round(citation.confidence * 100)}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PaymentPanel({ maxSpend }: { maxSpend: string }) {
  return (
    <section className="rounded border border-[#333] bg-[#202020] p-5">
      <SectionHeader icon={<CircleDollarSign size={18} />} title="x402 Payment Guard" action="Scoped" />
      <div className="mt-5 grid gap-3 text-sm">
        <StatusLine icon={<WalletCards size={15} />} label="Run budget" value={`$${maxSpend || "5.00"}`} />
        <StatusLine icon={<KeyRound size={15} />} label="New provider" value="Ask first" />
        <StatusLine icon={<Clock3 size={15} />} label="Settlement" value="Receipt stored" />
      </div>
      <div className="mt-5 rounded border border-[#343434] bg-[#181818] p-3 text-xs leading-5 text-[#aaa]">
        Payments are autonomous only inside an approved run scope. New APIs, higher budgets, or unrelated actions stay blocked until the user approves them.
      </div>
    </section>
  );
}

function ArchitecturePanel() {
  const links = [
    ["Workflow canvas", "/workflows", Network],
    ["Paid APIs", "/apis", KeyRound],
    ["Evidence ledger", "/evidence", FileSearch],
    ["Reports", "/reports", FileText],
  ] as const;

  return (
    <section className="rounded border border-[#333] bg-[#202020] p-5">
      <SectionHeader icon={<Gauge size={18} />} title="Product Surfaces" action="Demo" />
      <div className="mt-5 grid gap-2">
        {links.map(([label, href, Icon]) => (
          <a key={label} href={href} className="flex items-center justify-between rounded border border-[#333] bg-[#181818] p-3 text-sm text-[#d8d8d8] hover:bg-[#242424]">
            <span className="flex items-center gap-2">
              <Icon size={15} className="text-[#67e8bd]" />
              {label}
            </span>
            <ChevronRight size={15} />
          </a>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ icon, title, action }: { icon: ReactNode; title: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span className="text-[#67e8bd]">{icon}</span>
        {title}
      </h2>
      <span className="rounded border border-[#343434] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">{action}</span>
    </div>
  );
}

function StatusLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-[#333] bg-[#202020] px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-[#aaa]">
        <span className="text-[#67e8bd]">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-semibold text-white">{value}</span>
    </div>
  );
}

function templateForMode(mode: string) {
  if (mode === "Market research") return "market_research";
  if (mode === "Policy watch") return "policy_watch";
  return "product_research";
}

function parseEventMessage(data: string, fallback: string) {
  try {
    const parsed = JSON.parse(data) as { message?: string };
    return parsed.message ?? fallback;
  } catch {
    return data;
  }
}

async function readableError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return `${fallback} API returned ${response.status}.`;
  return text;
}

function formatEventName(type: string) {
  return type.replaceAll("_", " ");
}
