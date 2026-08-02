"use client";

import {
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileSearch,
  FileText,
  Gauge,
  Globe2,
  KeyRound,
  Loader2,
  Network,
  Send,
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

const automationSteps = [
  ["Plan", "Split the research request into paid and unpaid tasks.", "complete"],
  ["Search", "Call search and retrieval providers with x402 terms.", "active"],
  ["Enrich", "Normalize entities, prices, dates, and snippets.", "queued"],
  ["Verify", "Check important claims against independent evidence.", "queued"],
  ["Write", "Compile a cited answer with receipts and limitations.", "queued"],
] as const;

const demoSources = [
  {
    title: "Paid search result",
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
    <div className="min-h-[calc(100vh-48px)] bg-[#181818] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1240px]">
        <header className="mx-auto max-w-[880px] pt-8 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#67e8bd]">
            <Sparkles size={15} />
            Research Studio
          </p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Research that shows its work.
          </h1>
          <p className="mx-auto mt-4 max-w-[680px] text-sm leading-6 text-[#aaa]">
            Ask a question, let the agent plan paid API calls, settle x402 payments, verify evidence, and return a cited report.
          </p>
        </header>

        <section className="mx-auto mt-7 max-w-[920px] border-y border-[#303030] py-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e8bd]">Sponsored payment rail</p>
              <h2 className="mt-1 text-xl font-semibold">x402 powers autonomous paid research calls</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#aaa]">
              <span className="inline-flex items-center gap-2 rounded border border-[#343434] px-3 py-2">
                <CircleDollarSign size={15} className="text-[#67e8bd]" />
                Scoped spend
              </span>
              <span className="inline-flex items-center gap-2 rounded border border-[#343434] px-3 py-2">
                <BadgeCheck size={15} className="text-[#67e8bd]" />
                Receipts
              </span>
              <a href="/payments" className="mori-button mori-button-sm inline-flex items-center gap-2">
                x402 ledger
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </section>

        <form onSubmit={submitResearchRun} className="mx-auto mt-7 max-w-[920px] rounded-md border border-[#3a3a3a] bg-[#202020] shadow-2xl">
          <div className="px-4 pt-4">
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={4}
              className="min-h-32 w-full resize-none bg-transparent text-base leading-7 text-white outline-none placeholder:text-[#777]"
              placeholder="Ask anything that needs search, verification, enrichment, payments, and citations..."
            />
          </div>

          <AutomationWindow events={visibleEvents} job={job} />

          <div className="flex flex-col gap-3 border-t border-[#303030] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {["Market research", "Product research", "Policy watch"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`h-8 rounded px-3 text-xs font-semibold transition ${mode === item ? "bg-[#67e8bd] text-[#101010]" : "text-[#aaa] hover:bg-[#2b2b2b] hover:text-white"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex h-10 items-center gap-2 rounded border border-[#343434] bg-[#181818] px-3">
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

        <div className="mx-auto mt-4 flex max-w-[920px] flex-wrap justify-center gap-2">
          {promptChips.map((prompt) => (
            <button key={prompt} onClick={() => setQuery(prompt)} className="rounded px-3 py-1.5 text-xs text-[#aaa] hover:bg-[#242424] hover:text-white">
              {prompt}
            </button>
          ))}
        </div>

        {message ? (
          <p className={`mx-auto mt-4 max-w-[920px] rounded border px-3 py-2 text-sm ${status === "error" ? "border-[#5d3939] bg-[#2a1f1f] text-[#ffb6b6]" : "border-[#67e8bd]/35 bg-[#183029] text-[#9ff6d3]"}`}>
            {message}
          </p>
        ) : null}

        <main className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0">
            <SectionHeader icon={<Globe2 size={18} />} title="Search results" action="Ranked evidence" />
            <div className="mt-3 divide-y divide-[#303030] border-y border-[#303030]">
              {demoSources.map((source) => (
                <SourceResult key={source.title} {...source} />
              ))}
            </div>

            <section className="mt-10">
              <SectionHeader icon={<BookOpenCheck size={18} />} title="Answer draft" action={status === "complete" ? "Updated" : "Preview"} />
              <ReportPreview report={report} />
            </section>
          </section>

          <aside className="grid content-start gap-6">
            <PaymentPanel maxSpend={maxSpend} />
            <ProductSurfacePanel />
          </aside>
        </main>
      </div>
    </div>
  );
}

function AutomationWindow({ events, job }: { events: RunEvent[]; job: JobRecord | null }) {
  return (
    <div className="mx-3 mb-3 border-t border-[#303030] bg-[#1b1b1b] px-3 py-3">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f8f8f]">Automation window</p>
          <h2 className="mt-1 text-sm font-semibold text-white">Planner, paid API calls, verification, report writing</h2>
        </div>
        <span className="w-fit rounded border border-[#343434] px-2 py-1 font-mono text-[11px] text-[#aaa]">{job ? "backend stream" : "demo stream"}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.54fr_0.46fr]">
        <div className="space-y-3">
          {automationSteps.map(([label, detail, state], index) => (
            <div key={label} className="grid grid-cols-[28px_1fr] gap-3">
              <span className={`mt-0.5 grid size-6 place-items-center rounded-full text-[11px] font-semibold ${state === "complete" ? "bg-[#67e8bd] text-[#101010]" : state === "active" ? "border border-[#67e8bd] text-[#67e8bd]" : "border border-[#3a3a3a] text-[#8f8f8f]"}`}>
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{label}</span>
                <span className="block text-xs leading-5 text-[#aaa]">{detail}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-[#303030] pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f8f8f]">Meaningful events</p>
          <div className="mt-3 grid gap-3">
            {events.slice(0, 4).map((event, index) => (
              <div key={`${event.type}-${index}`} className="grid grid-cols-[18px_1fr] gap-2 text-sm">
                <CheckCircle2 size={14} className="mt-0.5 text-[#67e8bd]" />
                <span>
                  <span className="block font-medium capitalize text-white">{formatEventName(event.type)}</span>
                  <span className="block text-xs leading-5 text-[#aaa]">{event.message}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceResult({ title, domain, tag, score, detail }: { title: string; domain: string; tag: string; score: string; detail: string }) {
  return (
    <article className="py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#67e8bd]">{tag}</span>
            <span className="font-mono text-xs text-[#8f8f8f]">{domain}</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaa]">{detail}</p>
        </div>
        <span className="shrink-0 font-mono text-sm font-semibold text-[#67e8bd]">{score}</span>
      </div>
    </article>
  );
}

function ReportPreview({ report }: { report: ReportRecord }) {
  return (
    <div className="mt-4 border-y border-[#303030] py-5">
      <p className="text-xl font-semibold text-white">{report.title}</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#aaa]">{report.summary}</p>
      <pre className="mt-5 max-h-72 overflow-auto whitespace-pre-wrap border-l border-[#67e8bd] bg-[#151515] p-4 font-mono text-xs leading-5 text-[#cfcfcf]">{report.markdown}</pre>
      <div className="mt-5 grid gap-3">
        {(report.citations ?? []).slice(0, 3).map((citation) => (
          <div key={citation.id} className="flex items-start gap-2 text-sm">
            <BadgeCheck size={15} className="mt-0.5 shrink-0 text-[#67e8bd]" />
            <span>
              <span className="block text-white">{citation.claim}</span>
              <span className="mt-1 block font-mono text-xs text-[#aaa]">confidence {Math.round(citation.confidence * 100)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentPanel({ maxSpend }: { maxSpend: string }) {
  return (
    <section className="border-y border-[#303030] py-5">
      <SectionHeader icon={<CircleDollarSign size={18} />} title="x402 payment guard" action="Sponsor rail" />
      <div className="mt-5 grid gap-3 text-sm">
        <StatusLine icon={<WalletCards size={15} />} label="Run budget" value={`$${maxSpend || "5.00"}`} />
        <StatusLine icon={<KeyRound size={15} />} label="New provider" value="Ask first" />
        <StatusLine icon={<Clock3 size={15} />} label="Settlement" value="Receipt stored" />
      </div>
      <p className="mt-4 text-xs leading-5 text-[#aaa]">
        x402 lets the orchestrator pay provider APIs inside an approved scope. New providers, budget increases, and unrelated actions remain blocked until approved.
      </p>
      <a href="/payments" className="mori-button mori-button-sm mt-5 inline-flex items-center gap-2">
        Review x402 payments
        <ChevronRight size={14} />
      </a>
    </section>
  );
}

function ProductSurfacePanel() {
  const links = [
    ["Workflow canvas", "/workflows", Network],
    ["Paid APIs", "/apis", KeyRound],
    ["Evidence ledger", "/evidence", FileSearch],
    ["Reports", "/reports", FileText],
  ] as const;

  return (
    <section className="border-y border-[#303030] py-5">
      <SectionHeader icon={<Gauge size={18} />} title="Product surfaces" action="Demo" />
      <div className="mt-4 divide-y divide-[#303030]">
        {links.map(([label, href, Icon]) => (
          <a key={label} href={href} className="flex items-center justify-between py-3 text-sm text-[#d8d8d8] hover:text-white">
            <span className="flex items-center gap-2">
              <Icon size={15} className="text-[#67e8bd]" />
              {label}
            </span>
            <ChevronRight size={15} />
          </a>
        ))}
      </div>
      <a href="/reports" className="mori-button mori-button-sm mt-5 inline-flex items-center gap-2">
        Open reports
        <ChevronRight size={14} />
      </a>
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8f8f]">{action}</span>
    </div>
  );
}

function StatusLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#303030] pb-2 last:border-0 last:pb-0">
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
