"use client";

import {
  ArrowUp,
  AudioWaveform,
  ChevronDown,
  ExternalLink,
  FileSearch,
  Loader2,
  MessageSquare,
  Mic,
  PackageSearch,
  ShoppingBag,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import type { FormEvent, KeyboardEvent, ReactNode, RefObject } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useAuthenticatedApi } from "@/lib/api-client";

type ResearchMode = "quick" | "deep" | "compare";
type Question = { id: string; prompt: string; reason: string; options: string[]; required: boolean };
type QualityReview = { passed: boolean; score: number; citation_coverage: number; source_diversity: number; issues: string[] };
type Evidence = { id: string; title: string; excerpt: string; source_url?: string | null; source_type: string };
type Product = { id: string; name: string; description: string; price?: string | null; specifications: string[]; best_for?: string | null; retailer?: string | null; product_url: string; image_url?: string | null; evidence_id: string };
type ReviewSource = { title: string; url: string; excerpt: string; image_url?: string | null };
type SelectionReview = { product_id: string; status: string; summary: string; verdict: string; risks: string[]; specifications?: string[]; sources: ReviewSource[]; source_count: number };
type Decision = { kind: string; selection_id: string; label: string; metadata?: Record<string, unknown> };
type Job = { id: string; status: string; query: string; research_mode: ResearchMode; report_id?: string | null; quality_reviews?: QualityReview[]; automation_decisions?: Decision[] };
type Report = { title: string; summary: string; markdown: string; revision?: number; suggested_follow_ups?: string[]; products?: Product[] };
type Detail = { job?: Job; report?: Report | null; evidence?: Evidence[] };

export function ResearchAgentStudio() {
  const apiFetch = useAuthenticatedApi();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ResearchMode>("deep");
  const [job, setJob] = useState<Job | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [feedbackState, setFeedbackState] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseState, setPurchaseState] = useState("");
  const [selectionReview, setSelectionReview] = useState<SelectionReview | null>(null);
  const [reviewWorking, setReviewWorking] = useState(false);
  const hasThread = Boolean(job || working || error);

  useEffect(() => {
    const jobId = new URLSearchParams(window.location.search).get("job");
    if (!jobId) return;
    void apiFetch(`/v1/jobs/${jobId}`).then(async (response) => {
      if (!response.ok) return;
      const detail = await response.json() as Detail;
      setJob(detail.job ?? null);
      setReport(detail.report ?? null);
      setEvidence(detail.evidence ?? []);
      if (detail.job) setMode(detail.job.research_mode);
      const selection = detail.job?.automation_decisions?.find((item) => item.kind === "product_selection");
      setSelectedProduct(detail.report?.products?.find((item) => item.id === selection?.selection_id) ?? null);
      const savedReview = detail.job?.automation_decisions?.find((item) => item.kind === "product_review");
      setSelectionReview(savedReview?.metadata as SelectionReview | undefined ?? null);
    });
  }, [apiFetch]);

  async function refresh(jobId: string) {
    const response = await apiFetch(`/v1/jobs/${jobId}`);
    if (!response.ok) return;
    const detail = await response.json() as Detail;
    if (detail.job) setJob(detail.job);
    setReport(detail.report ?? null);
    setEvidence(detail.evidence ?? []);
  }

  async function runJob(currentJob: Job) {
    let settled = false;
    const runRequest = apiFetch(`/v1/jobs/${currentJob.id}/run`, { method: "POST" }).finally(() => { settled = true; });
    while (!settled) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      await refresh(currentJob.id);
    }
    const response = await runRequest;
    if (!response.ok) throw new Error(await responseMessage(response, "Live research could not start."));
    await refresh(currentJob.id);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userPrompt = query.trim();
    if (!userPrompt || working) return;
    const prompt = selectedProduct
      ? `${userPrompt}\n\nContinue with the selected product in context: ${selectedProduct.name}${selectedProduct.retailer ? ` from ${selectedProduct.retailer}` : ""}.`
      : userPrompt;
    setWorking(true);
    setError("");
    setReport(null);
    setEvidence([]);
    setQuestion(null);
    setPurchaseState("");
    try {
      const productRequest = /laptop|notebook|computer|phone|smartphone|mobile|tablet|product|headphone|earbud|speaker|monitor|television|\btv\b|camera|smartwatch|watch|keyboard|mouse|printer|router|console|shoe|sneaker|appliance|refrigerator|washing machine|air conditioner|buy|price|shopping/i.test(prompt);
      const response = await apiFetch("/v1/jobs", {
        method: "POST",
        body: JSON.stringify({
          query: prompt,
          locale: "en-US",
          output_format: "markdown",
          research_mode: mode,
          source_policy: { prefer_primary_sources: true, freshness_days: 365, allowed_domains: [], blocked_domains: [] },
          max_spend: { amount: "0", asset: "USDC", network: "base-sepolia" },
          require_citations: true,
          template: productRequest ? "product_research" : "cited_research_report",
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "The research job could not be created."));
      const created = await response.json() as { job?: Job; clarification_questions?: Question[] };
      if (!created.job) throw new Error("The API did not return a research job.");
      setJob(created.job);
      setQuery("");
      history.replaceState(null, "", `/?job=${created.job.id}`);
      const neededQuestion = created.clarification_questions?.[0];
      if (neededQuestion) {
        setQuestion(neededQuestion);
      } else {
        await runJob(created.job);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Live research failed.");
    } finally {
      setWorking(false);
    }
  }

  async function continueWithAnswer() {
    if (!job || !question || !answer.trim() || working) return;
    setWorking(true);
    setError("");
    try {
      const response = await apiFetch(`/v1/jobs/${job.id}/clarifications`, {
        method: "POST",
        body: JSON.stringify({ answers: { [question.id]: answer.trim() } }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "The clarification could not be saved."));
      const body = await response.json() as { job?: Job };
      if (!body.job) throw new Error("The API did not return an updated job.");
      setQuestion(null);
      setAnswer("");
      await runJob(body.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Research could not continue.");
    } finally {
      setWorking(false);
    }
  }

  async function submitFeedback(message: string, rating: number, requestRevision: boolean) {
    if (!job || !report || working) return;
    setWorking(true);
    setFeedbackState("");
    try {
      const response = await apiFetch(`/v1/jobs/${job.id}/feedback`, {
        method: "POST",
        body: JSON.stringify({ message, rating, request_revision: requestRevision }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Feedback could not be saved."));
      const body = await response.json() as { job?: Job; report?: Report; feedback?: { revision_status: string } };
      if (body.job) setJob(body.job);
      if (body.report) setReport(body.report);
      setFeedbackState(body.feedback?.revision_status === "revised" ? "Revision ready" : "Feedback saved");
    } catch (cause) {
      setFeedbackState(cause instanceof Error ? cause.message : "Feedback failed");
    } finally {
      setWorking(false);
    }
  }

  async function selectProduct(product: Product) {
    if (!job || working || reviewWorking) return;
    setSelectedProduct(product);
    setSelectionReview(null);
    setReviewWorking(true);
    setPurchaseState("Researching specifications, owner reports, official support, and warranty coverage…");
    try {
      const response = await apiFetch(`/v1/jobs/${job.id}/decisions`, {
        method: "POST",
        body: JSON.stringify({
          kind: "product_selection",
          selection_id: product.id,
          label: product.name,
          metadata: { product_url: product.product_url, price: product.price, retailer: product.retailer },
        }),
      });
      if (!response.ok) {
        setPurchaseState(await responseMessage(response, "Selection could not be saved."));
        return;
      }
      const reviewResponse = await apiFetch("/v1/products/selection-research", {
        method: "POST",
        body: JSON.stringify({ job_id: job.id, product_id: product.id }),
      });
      if (!reviewResponse.ok) {
        setPurchaseState(await responseMessage(reviewResponse, "The deeper product review could not be completed."));
        return;
      }
      const review = await reviewResponse.json() as SelectionReview;
      setSelectionReview(review);
      setPurchaseState("");
    } catch (cause) {
      setPurchaseState(cause instanceof Error ? cause.message : "Product research could not be completed.");
    } finally {
      setReviewWorking(false);
    }
  }

  async function requestPurchase(product: Product) {
    if (!job || working) return;
    setPurchaseState("Preparing a secure x402 purchase request…");
    const response = await apiFetch("/v1/products/purchase-requests", {
      method: "POST",
      body: JSON.stringify({ job_id: job.id, product_id: product.id, quantity: 1 }),
    });
    const body = await response.json().catch(() => ({})) as { status?: string; message?: string; retailer_url?: string; provider_call?: { payment_terms?: { amount: string; asset: string; network: string } } };
    if (!response.ok) {
      setPurchaseState(typeof body.message === "string" ? body.message : "Purchase request could not be prepared.");
      return;
    }
    const terms = body.provider_call?.payment_terms;
    setPurchaseState(terms
      ? `${body.message ?? "Payment confirmation required"} ${terms.amount} ${terms.asset} on ${terms.network}.`
      : body.message ?? "Purchase request prepared.");
  }

  return (
    <div className="min-h-screen bg-[#141413] text-[#ececea]">
      {!hasThread ? (
        <Landing query={query} setQuery={setQuery} onSubmit={submit} working={working} mode={mode} setMode={setMode}/>
      ) : (
        <Thread
          query={query} setQuery={setQuery} onSubmit={submit} working={working} mode={mode} setMode={setMode}
          job={job} report={report} evidence={evidence} question={question} answer={answer} setAnswer={setAnswer}
          continueWithAnswer={continueWithAnswer} error={error}
          submitFeedback={submitFeedback} feedbackState={feedbackState}
          selectedProduct={selectedProduct} selectProduct={selectProduct} requestPurchase={requestPurchase} purchaseState={purchaseState}
          selectionReview={selectionReview} reviewWorking={reviewWorking}
        />
      )}
    </div>
  );
}

function Landing(props: ComposerProps) {
  return <div className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col justify-center px-5 pb-[15vh]"><div className="mb-6 px-3"><p className="text-[11px] text-[#898986]">Search</p><h1 className="mt-2 text-[23px] font-medium tracking-[-0.035em] text-[#e7e7e4]">What do you want to know?</h1></div><Composer {...props}/></div>;
}

type ThreadProps = ComposerProps & {
  job: Job | null;
  report: Report | null;
  evidence: Evidence[];
  question: Question | null;
  answer: string;
  setAnswer: (value: string) => void;
  continueWithAnswer: () => void;
  error: string;
  submitFeedback: (message: string, rating: number, requestRevision: boolean) => Promise<void>;
  feedbackState: string;
  selectedProduct: Product | null;
  selectProduct: (product: Product) => Promise<void>;
  requestPurchase: (product: Product) => Promise<void>;
  purchaseState: string;
  selectionReview: SelectionReview | null;
  reviewWorking: boolean;
};

function Thread({ job, report, evidence, question, answer, setAnswer, continueWithAnswer, error, submitFeedback, feedbackState, selectedProduct, selectProduct, requestPurchase, purchaseState, selectionReview, reviewWorking, ...composer }: ThreadProps) {
  const quality = job?.quality_reviews?.at(-1);
  const conversationRef = useRef<HTMLDivElement>(null);
  const selectionTurnRef = useRef<HTMLDivElement>(null);
  const conversationTailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let innerFrame = 0;
    const frame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        const target = selectedProduct && reviewWorking ? selectionTurnRef.current : conversationTailRef.current;
        target?.scrollIntoView({ behavior: "smooth", block: selectedProduct && reviewWorking ? "start" : "end" });
      });
    });
    const fallback = window.setTimeout(() => {
      const target = selectedProduct && reviewWorking ? selectionTurnRef.current : conversationTailRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: selectedProduct && reviewWorking ? "start" : "end" });
    }, 180);
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(innerFrame); window.clearTimeout(fallback); };
  }, [job?.id, report?.markdown, question?.id, error, selectedProduct?.id, selectionReview?.summary, reviewWorking, purchaseState]);
  return <div className="mx-auto grid min-h-screen max-w-[1320px] gap-8 px-5 pt-14 xl:h-screen xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_380px] xl:overflow-hidden">
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[780px] min-w-0 flex-col overflow-hidden pb-3 xl:h-full xl:min-h-0">
      <div ref={conversationRef} className="main-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8 pr-3">
        {job ? <UserPrompt>{job.query}</UserPrompt> : null}
        {question ? <Clarification question={question} answer={answer} setAnswer={setAnswer} continueWithAnswer={continueWithAnswer} working={composer.working}/> : null}
        {error ? <div className="mb-6 rounded-xl border border-[#66383b] bg-[#291a1b] px-4 py-3 text-sm leading-6 text-[#efb2b5]">{error}</div> : null}
        <Answer report={report} quality={quality} working={composer.working} setQuery={composer.setQuery} setMode={composer.setMode} submitFeedback={submitFeedback} feedbackState={feedbackState} selectedProduct={selectedProduct} requestPurchase={requestPurchase} purchaseState={purchaseState} selectionReview={selectionReview} reviewWorking={reviewWorking} selectionAnchorRef={selectionTurnRef}/>
        <div ref={conversationTailRef} aria-hidden="true" className="h-[18vh] min-h-20"/>
      </div>
      <div className="z-20 shrink-0 border-t border-white/[0.05] bg-[#141413] pb-2 pt-3"><Composer {...composer} compact/></div>
    </main>
    <ProductRail products={report?.products ?? []} evidence={evidence} review={selectionReview} selectedProduct={selectedProduct} onSelect={selectProduct}/>
  </div>;
}

type ComposerProps = { query: string; setQuery: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; working: boolean; mode: ResearchMode; setMode: (value: ResearchMode) => void; compact?: boolean };

function Composer({ query, setQuery, onSubmit, working, mode, setMode, compact = false }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const label = mode === "quick" ? "Search" : mode === "deep" ? "Deep research" : "Compare";
  const nextMode = mode === "quick" ? "deep" : mode === "deep" ? "compare" : "quick";
  const canSubmit = query.trim().length > 0 && !working;
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 120 ? "auto" : "hidden";
  }, [query]);
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSubmit) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  }
  return <form onSubmit={onSubmit} className={`rounded-[16px] border border-white/[0.12] bg-[#1d1d1c] px-3.5 py-3 shadow-[0_20px_60px_rgba(0,0,0,.18)] transition focus-within:border-white/[0.2] ${compact ? "" : "min-h-[108px]"}`}>
    <textarea ref={textareaRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeyDown} rows={1} placeholder={compact ? "Ask a follow-up" : "Type @ for connectors"} className="scrollbar-none min-h-6 max-h-[120px] w-full resize-none overflow-y-hidden bg-transparent px-1.5 py-0.5 text-[15px] leading-6 text-[#e8e8e5] outline-none placeholder:text-[#777774]"/>
    <div className="mt-2 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-1.5"><button type="button" className="grid size-8 shrink-0 place-items-center rounded-full text-[#969693] hover:bg-white/[0.06]" aria-label="Add context"><Plus size={18}/></button><button type="button" onClick={() => setMode(nextMode)} className="flex h-8 items-center gap-1.5 rounded-full border border-white/[0.09] px-2.5 text-xs text-[#d0d0cd]"><Search size={14}/>{label}<ChevronDown size={13}/></button></div><div className="flex items-center gap-1"><button type="button" className="grid size-8 place-items-center text-[#858582]" aria-label="Microphone"><Mic size={15}/></button><button type={canSubmit ? "submit" : "button"} disabled={working} className="grid size-8 place-items-center rounded-full bg-[#e8e8e5] text-[#171716]" aria-label={canSubmit ? "Send" : "Voice input"}>{working ? <Loader2 size={16} className="animate-spin"/> : canSubmit ? <ArrowUp size={16}/> : <AudioWaveform size={17}/>}</button></div></div>
  </form>;
}

function UserPrompt({ children }: { children: ReactNode }) {
  return <div className="message-enter mb-9 flex justify-end"><div className="max-w-[82%]"><p className="mb-1.5 pr-1 text-right text-[10px] font-medium uppercase tracking-[0.12em] text-[#666663]">You</p><div className="rounded-[18px] rounded-br-md border border-white/[0.07] bg-[#242422] px-4 py-3 text-sm leading-6 text-[#e5e5e2] shadow-[0_10px_30px_rgba(0,0,0,.12)]">{children}</div></div></div>;
}

function Clarification({ question, answer, setAnswer, continueWithAnswer, working }: { question: Question; answer: string; setAnswer: (value: string) => void; continueWithAnswer: () => void; working: boolean }) {
  return <section className="mb-8 border-l-2 border-[#c78349] pl-5"><p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#b17b50]">One detail before I continue</p><h2 className="mt-2 text-lg font-medium text-[#ededeb]">{question.prompt}</h2><p className="mt-2 text-sm leading-6 text-[#999996]">{question.reason}</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{question.options.map((option) => <button key={option} onClick={() => setAnswer(option)} className={`rounded-xl border px-3 py-3 text-left text-sm transition ${answer === option ? "border-[#bd7a45] bg-[#2b2119] text-white" : "border-white/[0.09] bg-[#1b1b1a] text-[#c3c3c0] hover:border-white/[0.18]"}`}>{option}</button>)}</div><div className="mt-3 flex gap-2"><input value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") continueWithAnswer(); }} placeholder="Or type a specific answer" className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[#1b1b1a] px-3 py-2.5 text-sm outline-none focus:border-[#bd7a45]"/><button onClick={continueWithAnswer} disabled={working || !answer.trim()} className="rounded-xl bg-[#e8e8e5] px-4 text-sm font-medium text-[#181817] disabled:opacity-40">Continue</button></div></section>;
}

function Answer({ report, quality, working, setQuery, setMode, submitFeedback, feedbackState, selectedProduct, requestPurchase, purchaseState, selectionReview, reviewWorking, selectionAnchorRef }: { report: Report | null; quality?: QualityReview; working: boolean; setQuery: (value: string) => void; setMode: (value: ResearchMode) => void; submitFeedback: (message: string, rating: number, requestRevision: boolean) => Promise<void>; feedbackState: string; selectedProduct: Product | null; requestPurchase: (product: Product) => Promise<void>; purchaseState: string; selectionReview: SelectionReview | null; reviewWorking: boolean; selectionAnchorRef: RefObject<HTMLDivElement | null> }) {
  if (working && !report) return <ThinkingState/>;
  if (!report) return null;
  return <article className="answer-enter">
    <div className="mb-5 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs text-[#878784]"><FileSearch size={15}/>Answer</span>{quality ? <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-[#969693]">Evidence {quality.score}/100</span> : null}</div>
    {!selectedProduct && report.products?.length ? <p className="mb-6 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm leading-6 text-[#aaa9a6]">I found {report.products.length} product options from the sources reviewed. Select one in the Products panel to research its specifications, owner experience, and support.</p> : null}
    <MarkdownContent content={report.markdown}/>
    {selectedProduct ? <div ref={selectionAnchorRef} className="mt-14 min-h-[68vh] scroll-mt-4 border-t border-white/[0.065] pt-10"><UserPrompt>Research this product: <span className="font-medium text-white">{selectedProduct.name}</span></UserPrompt><div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3"><span className="mt-0.5 grid size-7 place-items-center rounded-full border border-white/[0.08] bg-[#1d1d1c] text-[#bca6ee]"><Sparkles size={13}/></span><div className="min-w-0"><p className="mb-4 text-[11px] font-medium text-[#858582]">Product research</p><SelectionReviewCard product={selectedProduct} review={selectionReview} working={reviewWorking}/>{selectedProduct && selectionReview ? <ProductActions product={selectedProduct} prompts={report.suggested_follow_ups ?? []} setQuery={setQuery} setMode={setMode} requestPurchase={requestPurchase} state={purchaseState}/> : null}{!selectionReview && !reviewWorking && purchaseState ? <p className="mb-6 rounded-xl border border-[#66383b]/70 bg-[#291a1b]/70 px-4 py-3 text-sm text-[#e5a7aa]">{purchaseState}</p> : null}</div></div></div> : null}
    {!selectedProduct ? <FollowUps items={report.suggested_follow_ups ?? []} setQuery={setQuery}/> : null}
    <FeedbackPanel onSubmit={submitFeedback} working={working} state={feedbackState}/>
  </article>;
}

function SelectionReviewCard({ product, review, working }: { product: Product; review: SelectionReview | null; working: boolean }) {
  const specifications = review?.specifications?.length ? review.specifications : product.specifications;
  return <section className="review-enter mb-7 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#181817]/70 shadow-[0_20px_60px_rgba(0,0,0,.12)]">
    <div className="border-b border-white/[0.065] px-5 py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#8eb7a5]">Selected product</p><h2 className="mt-1.5 text-xl font-medium tracking-[-0.025em] text-[#ededeb]">{product.name}</h2></div>{product.price ? <span className="rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#dededb]">{product.price}</span> : null}</div><p className="mt-3 text-sm leading-6 text-[#aaa9a6]">{product.description}</p></div>
    <div className="px-5 py-5"><div className="grid gap-4 sm:grid-cols-2">{product.retailer ? <div className="rounded-xl bg-white/[0.025] px-3.5 py-3"><p className="text-[9px] uppercase tracking-[0.12em] text-[#666663]">Retailer</p><p className="mt-1.5 text-sm text-[#d0d0cd]">{product.retailer}</p></div> : null}{product.best_for ? <div className="rounded-xl bg-white/[0.025] px-3.5 py-3"><p className="text-[9px] uppercase tracking-[0.12em] text-[#666663]">Best for</p><p className="mt-1.5 text-sm text-[#d0d0cd]">{product.best_for}</p></div> : null}</div>
    <div className="mt-5"><p className="text-[10px] font-medium uppercase tracking-[0.13em] text-[#777774]">Verified specifications</p>{specifications.length ? <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">{specifications.map((spec) => <li key={spec} className="flex gap-2.5 text-sm leading-5 text-[#b7b7b4]"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#8eb7a5] shadow-[0_0_8px_rgba(142,183,165,.5)]"/>{spec}</li>)}</ul> : <p className="mt-3 text-sm text-[#858582]">{working ? "Reading official specifications now…" : "No specification was supported strongly enough by the retrieved sources."}</p>}</div>
    {working ? <ThinkingState compact label="Thinking" detail="Verifying specifications, owner reports, warranty, and official support"/> : null}
    {!working && review ? <div className="mt-6 border-t border-white/[0.07] pt-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium text-[#a9c3b2]">Research complete</p><span className="rounded-full bg-white/[0.035] px-2 py-1 text-[10px] text-[#737370]">{review.source_count} new sources</span></div><p className="mt-3 text-sm leading-6 text-[#c5c5c2]">{review.summary}</p>{review.risks.length ? <><p className="mt-5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#777774]">Things to consider</p><ul className="mt-2.5 space-y-2 text-xs leading-5 text-[#9e9e9a]">{review.risks.map((risk) => <li key={risk} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-[#b58b70]"/>{risk}</li>)}</ul></> : null}<div className="mt-5 rounded-xl border border-[#8eb7a5]/15 bg-[#8eb7a5]/[0.045] px-4 py-3 text-sm leading-6 text-[#afc3b6]">{review.verdict}</div></div> : null}</div>
  </section>;
}

function ThinkingState({ compact = false, label = "Thinking", detail = "Planning searches, reading products, and checking sources" }: { compact?: boolean; label?: string; detail?: string }) {
  return <div className={compact ? "pt-6" : "py-10"} role="status" aria-live="polite"><div className="thinking-glow relative inline-flex items-center gap-2.5 overflow-hidden px-1 py-2"><span className="relative z-10 size-1.5 animate-pulse rounded-full bg-[#c9b4ff] shadow-[0_0_12px_rgba(201,180,255,.9)]"/><span className="relative z-10 text-sm font-medium tracking-[-0.01em] text-[#c9c9c6]">{label}</span></div><p className="mt-1 text-xs text-[#737370]">{detail}</p></div>;
}

function ProductRail({ products, evidence, review, selectedProduct, onSelect }: { products: Product[]; evidence: Evidence[]; review: SelectionReview | null; selectedProduct: Product | null; onSelect: (product: Product) => Promise<void> }) {
  const [tab, setTab] = useState<"products" | "sources">("products");
  const allSources = review ? [...evidence.map((item) => ({ title: item.title, url: item.source_url ?? "", excerpt: item.excerpt })), ...review.sources] : evidence.map((item) => ({ title: item.title, url: item.source_url ?? "", excerpt: item.excerpt }));
  const uniqueSources = allSources.filter((item, index, list) => item.url && list.findIndex((candidate) => candidate.url === item.url) === index);
  return <aside className="rail-scroll min-w-0 pb-8 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:border-l xl:border-white/[0.07] xl:pl-6 xl:pr-2"><div className="sticky top-0 z-10 -mx-1 border-b border-white/[0.08] bg-[#141413]/95 px-1 py-3 backdrop-blur-xl"><div className="flex items-center justify-between"><div className="flex gap-1"><RailTab active={tab === "products"} onClick={() => setTab("products")}>Products <span>{products.length}</span></RailTab><RailTab active={tab === "sources"} onClick={() => setTab("sources")}>Sources <span>{uniqueSources.length}</span></RailTab></div><span className="text-[10px] text-[#62625f]">live</span></div></div>{tab === "products" ? (products.length ? <div className="grid gap-3 pt-4">{products.map((product, index) => <RailProductCard key={product.id} product={product} index={index} selected={selectedProduct?.id === product.id} onSelect={onSelect}/>)}</div> : <ProductRailEmpty working={!evidence.length}/>) : <SourceLinks sources={uniqueSources}/>}</aside>;
}

function RailTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-2.5 py-1.5 text-xs transition ${active ? "bg-white/[0.07] text-[#e4e4e1]" : "text-[#777774] hover:text-[#bdbdba]"}`}>{children}</button>;
}

function SourceLinks({ sources }: { sources: Array<{ title: string; url: string; excerpt: string }> }) {
  if (!sources.length) return <p className="px-2 pt-5 text-xs leading-5 text-[#737370]">Sources will appear after live research completes.</p>;
  return <div className="divide-y divide-white/[0.06] pt-2">{sources.map((source, index) => { const host = safeHost(source.url); return <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="source-row-enter group flex gap-3 py-3" style={{ animationDelay: `${Math.min(index * 45, 300)}ms` }}><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-white/[0.045] text-[9px] text-[#858582]">{index + 1}</span><span className="min-w-0"><span className="line-clamp-2 text-xs font-medium leading-5 text-[#cfcfcc] group-hover:text-white">{source.title}</span><span className="mt-1 flex items-center gap-1 text-[10px] text-[#6f8f83]">{host}<ExternalLink size={9}/></span><span className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#6f6f6c]">{source.excerpt}</span></span></a>; })}</div>;
}

function safeHost(value: string) { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return "source"; } }

function RailProductCard({ product, index, selected, onSelect }: { product: Product; index: number; selected: boolean; onSelect: (product: Product) => Promise<void> }) {
  return <article style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }} className={`product-card-enter group overflow-hidden rounded-2xl border bg-[#191918] transition-all duration-300 ${selected ? "border-[#8eb7a5] shadow-[0_0_0_1px_rgba(142,183,165,.24),0_18px_44px_rgba(0,0,0,.24)]" : "border-white/[0.09] hover:-translate-y-0.5 hover:border-white/[0.18] hover:shadow-[0_18px_44px_rgba(0,0,0,.22)]"}`}>
    <div className="relative overflow-hidden bg-[#f3f3f0]">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="product-image aspect-[16/9] w-full object-contain p-3"/> : <div className="grid aspect-[16/9] place-items-center bg-[#20201f]"><PackageSearch size={28} className="text-[#5d5d59]"/></div>}{product.price ? <span className="absolute bottom-2 right-2 rounded-full bg-[#151514]/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur">{product.price}</span> : null}</div>
    <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[10px] uppercase tracking-[0.1em] text-[#737370]">{product.retailer || "Verified retailer"}</p><h3 className="mt-1 text-[14px] font-medium leading-5 text-[#ececea]">{product.name}</h3></div><span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/[0.05] text-[10px] text-[#8b8b88]">{index + 1}</span></div><p className="mt-2 line-clamp-3 text-xs leading-5 text-[#92928f]">{product.description}</p>{product.specifications.length ? <div className="mt-3 flex flex-wrap gap-1.5">{product.specifications.slice(0, 3).map((spec) => <span key={spec} className="max-w-full truncate rounded-md bg-white/[0.045] px-2 py-1 text-[10px] text-[#a8a8a5]">{spec}</span>)}</div> : null}<button type="button" onClick={() => void onSelect(product)} className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-[.98] ${selected ? "bg-[#dce9e1] text-[#162019]" : "bg-white/[0.07] text-[#dededb] hover:bg-white/[0.12]"}`}>{selected ? "Selected" : "Select"}</button></div>
  </article>;
}

function ProductRailEmpty({ working }: { working: boolean }) {
  return <div className="rail-empty-enter grid min-h-72 place-items-center px-6 text-center"><div><div className="mx-auto grid size-11 place-items-center rounded-2xl bg-white/[0.035]"><PackageSearch size={20} className={working ? "animate-pulse text-[#8eb7a5]" : "text-[#60605d]"}/></div><p className="mt-3 text-sm text-[#aaa9a6]">{working ? "Finding product options" : "No product cards yet"}</p><p className="mt-1 text-xs leading-5 text-[#6f6f6c]">Images, prices, descriptions, and selection controls appear here.</p></div></div>;
}

function MarkdownContent({ content }: { content: string }) {
  const lines = mainChatText(content).replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith("```")) { const language = line.slice(3).trim(); const code: string[] = []; index += 1; while (index < lines.length && !lines[index].trim().startsWith("```")) { code.push(lines[index]); index += 1; } index += 1; blocks.push(<pre key={`code-${index}`} className="my-5 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#10100f] p-4 text-[13px] leading-6 text-[#d0d0cd]"><code data-language={language}>{code.join("\n")}</code></pre>); continue; }
    if (line.startsWith("|") && index + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[index + 1].trim())) {
      const rows: string[][] = [];
      const header = tableCells(line);
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) { rows.push(tableCells(lines[index])); index += 1; }
      blocks.push(<div key={`table-${index}`} className="my-6 overflow-x-auto rounded-xl border border-white/[0.09]"><table className="w-full border-collapse text-left text-sm"><thead className="bg-white/[0.04]"><tr>{header.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-white/[0.09] px-3 py-2.5 font-medium text-[#e1e1de]">{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-white/[0.06] last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2.5 align-top text-[#b5b5b2]">{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) { const level = heading[1].length; const classes = level === 1 ? "mb-4 mt-2 text-2xl font-medium" : level === 2 ? "mb-3 mt-8 text-lg font-medium" : "mb-2 mt-6 text-base font-medium"; blocks.push(<h2 key={index} className={`${classes} tracking-[-0.02em] text-[#ededeb]`}>{inline(heading[2])}</h2>); index += 1; continue; }
    if (/^[-*]\s+/.test(line)) { const items: string[] = []; while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) { items.push(lines[index].trim().replace(/^[-*]\s+/, "")); index += 1; } blocks.push(<ul key={`ul-${index}`} className="my-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-[#c2c2bf]">{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>); continue; }
    if (/^\d+\.\s+/.test(line)) { const items: string[] = []; while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) { items.push(lines[index].trim().replace(/^\d+\.\s+/, "")); index += 1; } blocks.push(<ol key={`ol-${index}`} className="my-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-[#c2c2bf]">{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>); continue; }
    if (line.startsWith("> ")) { blocks.push(<blockquote key={index} className="my-5 border-l-2 border-white/[0.18] pl-4 text-[15px] italic leading-7 text-[#aaa9a6]">{inline(line.slice(2))}</blockquote>); index += 1; continue; }
    const paragraph: string[] = [line]; index += 1; while (index < lines.length && lines[index].trim() && !/^(#{1,4})\s+|^[-*]\s+|^\|/.test(lines[index].trim())) { paragraph.push(lines[index].trim()); index += 1; } blocks.push(<p key={`p-${index}`} className="my-4 text-[15px] leading-7 text-[#c2c2bf]">{inline(paragraph.join(" "))}</p>);
  }
  return <div className="markdown-answer">{blocks}</div>;
}

function ProductActions({ product, prompts, setQuery, setMode, requestPurchase, state }: { product: Product; prompts: string[]; setQuery: (value: string) => void; setMode: (value: ResearchMode) => void; requestPurchase: (product: Product) => Promise<void>; state: string }) {
  const [purchaseChoice, setPurchaseChoice] = useState<"yes" | "no" | null>(null);
  const comparePrompt = prompts.find((item) => /compare|versus|alternative/i.test(item));
  const explorePrompt = prompts.find((item) => item !== comparePrompt);
  return <section className="mb-8 rounded-2xl border border-white/[0.09] bg-[#181817] p-4"><div className="flex items-center gap-2"><ShoppingBag size={15} className="text-[#a9c3b2]"/><p className="text-sm font-medium text-[#dededb]">Would you like to buy {product.name}?</p></div><p className="mt-2 text-xs leading-5 text-[#858582]">A purchase request is created only after you choose Yes. Any x402 payment terms still require wallet confirmation.</p><div className="mt-4 flex flex-wrap gap-2"><button disabled={purchaseChoice === "yes"} onClick={() => { setPurchaseChoice("yes"); void requestPurchase(product); }} className="rounded-lg bg-[#e4e4e1] px-3.5 py-2 text-xs font-medium text-[#171716] disabled:opacity-55">{purchaseChoice === "yes" ? "Purchase requested" : "Yes, buy"}</button><button onClick={() => setPurchaseChoice("no")} className="rounded-lg border border-white/[0.09] px-3.5 py-2 text-xs text-[#c8c8c5]">No, not now</button>{explorePrompt ? <button onClick={() => setQuery(explorePrompt)} className="rounded-lg border border-white/[0.09] px-3 py-2 text-xs text-[#c8c8c5]">Explore more</button> : null}{comparePrompt ? <button onClick={() => { setMode("compare"); setQuery(comparePrompt); }} className="rounded-lg border border-white/[0.09] px-3 py-2 text-xs text-[#c8c8c5]">Compare</button> : null}</div>{purchaseChoice === "no" ? <p className="mt-3 text-xs leading-5 text-[#92928f]">No purchase was requested. You can keep comparing or ask another question.</p> : null}{state ? <p className="mt-3 text-xs leading-5 text-[#a9b8ae]">{state}</p> : null}</section>;
}

function tableCells(row: string) { return row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()); }
function mainChatText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, "$1")
    .replace(/<https?:\/\/[^>]+>/gi, "")
    .replace(/https?:\/\/[^\s<>)\]]+/gi, "")
    .replace(/[ \t]+\n/g, "\n");
}
function inline(value: string): ReactNode {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  return value.split(pattern).filter(Boolean).map((part, index) => {
    if (part.startsWith("**")) return <strong key={index} className="font-semibold text-[#e8e8e5]">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={index} className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[13px] text-[#d7b98f]">{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(part);
    if (link) return <Fragment key={index}>{link[1]}</Fragment>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function FollowUps({ items, setQuery }: { items: string[]; setQuery: (value: string) => void }) { if (!items.length) return null; return <div className="mt-8 border-t border-white/[0.07] pt-5"><p className="text-[11px] uppercase tracking-[0.12em] text-[#777774]">Explore next</p><div className="mt-3 grid gap-2">{items.map((item) => <button key={item} onClick={() => setQuery(item)} className="text-left text-sm text-[#aaa9a6] hover:text-white">{item}</button>)}</div></div>; }
function FeedbackPanel({ onSubmit, working, state }: { onSubmit: (message: string, rating: number, requestRevision: boolean) => Promise<void>; working: boolean; state: string }) { const [open, setOpen] = useState(false); const [message, setMessage] = useState(""); return <div className="mt-5">{!open ? <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-xs text-[#858582] hover:text-white"><MessageSquare size={14}/>Improve this answer</button> : <div className="rounded-xl border border-white/[0.09] bg-[#1a1a19] p-4"><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder="What should change?" className="w-full resize-none bg-transparent text-sm outline-none"/><div className="mt-3 flex justify-between gap-3"><span className="text-xs text-[#777]">{state}</span><div className="flex gap-2"><button disabled={working || message.trim().length < 2} onClick={() => void onSubmit(message, 4, false)} className="rounded-lg px-3 py-2 text-xs text-[#aaa] disabled:opacity-40">Save</button><button disabled={working || message.trim().length < 2} onClick={() => void onSubmit(message, 4, true)} className="rounded-lg bg-[#e6e6e3] px-3 py-2 text-xs text-[#191918] disabled:opacity-40">Revise</button></div></div></div>}</div>; }

async function responseMessage(response: Response, fallback: string) {
  try { const body = await response.json() as { detail?: string }; return body.detail || fallback; } catch { return fallback; }
}
