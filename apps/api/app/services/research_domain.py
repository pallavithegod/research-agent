from datetime import datetime, timedelta, timezone
from decimal import Decimal
from hashlib import sha256

from app.core.config import Settings
from app.core.security import hmac_digest
from app.domain.enums import EventType, JobStatus, StepType
from app.domain.schemas import (
    Citation,
    EvidenceItem,
    JobEvent,
    JobPlan,
    JobStep,
    Money,
    PaymentReceipt,
    PaymentTerms,
    ProviderCall,
    Report,
    ResearchJob,
)
from app.storage.memory import store


class ResearchDomainService:
    """Production-shaped demo executor for the Research Studio flow.

    This keeps external services mocked, but stores the same domain objects the
    real orchestrator will need: provider calls, x402 terms and receipts,
    evidence, citations, events, spend, and final reports.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def run_research(self, job: ResearchJob) -> Report:
        plan = store.plans.get(job.plan_id or "")
        if not plan:
            raise ValueError("Cannot run job without a research plan.")

        job.status = JobStatus.RUNNING
        job.updated_at = utcnow()
        store.jobs[job.id] = job
        self._event(
            job,
            EventType.RUNNING,
            "Research orchestration started.",
            {"stage": "orchestration", "plan_id": plan.id, "step_count": len(plan.steps)},
        )

        evidence: list[EvidenceItem] = []
        citations: list[Citation] = []
        provider_calls: list[ProviderCall] = []
        receipts: list[PaymentReceipt] = []
        budget_exhausted = False

        for step in plan.steps:
            step.status = JobStatus.RUNNING
            step.updated_at = utcnow()
            store.plans[plan.id] = plan
            self._event(job, EventType.RUNNING, self._step_started_message(step), {"stage": step.type, "step_id": step.id})

            if not step.provider or step.estimated_cost.amount <= 0:
                step.status = JobStatus.SUCCEEDED
                step.updated_at = utcnow()
                store.plans[plan.id] = plan
                continue

            if job.amount_spent.amount + step.estimated_cost.amount > job.max_spend.amount:
                budget_exhausted = True
                step.status = JobStatus.BUDGET_EXHAUSTED
                step.updated_at = utcnow()
                store.plans[plan.id] = plan
                self._event(
                    job,
                    EventType.BUDGET_EXHAUSTED,
                    f"Skipped {step.provider}; job spend cap would be exceeded.",
                    {
                        "stage": step.type,
                        "step_id": step.id,
                        "provider_id": step.provider,
                        "estimated_cost": str(step.estimated_cost.amount),
                        "max_spend": str(job.max_spend.amount),
                    },
                )
                continue

            call, receipt = self._settle_provider_call(job, step)
            provider_calls.append(call)
            receipts.append(receipt)
            job.amount_spent.amount += receipt.amount.amount
            job.updated_at = utcnow()
            store.jobs[job.id] = job

            produced = self._evidence_for_step(job, step, call, receipt)
            if produced:
                evidence.extend(produced)
                citations.extend(self._citations_for_evidence(produced, step))

            call.status = "succeeded"
            store.provider_calls[call.id] = call
            step.status = JobStatus.SUCCEEDED
            step.updated_at = utcnow()
            store.plans[plan.id] = plan
            self._event(
                job,
                EventType.RUNNING,
                self._step_completed_message(step, produced),
                {
                    "stage": step.type,
                    "step_id": step.id,
                    "provider_id": step.provider,
                    "provider_call_id": call.id,
                    "receipt_id": receipt.id,
                    "evidence_count": len(produced),
                },
            )

        report = self._build_report(job, plan, evidence, citations, provider_calls, receipts, budget_exhausted)
        store.reports[report.id] = report

        job.report_id = report.id
        job.status = JobStatus.PARTIAL if budget_exhausted else JobStatus.SUCCEEDED
        job.updated_at = utcnow()
        store.jobs[job.id] = job
        self._event(
            job,
            EventType.PARTIAL if budget_exhausted else EventType.SUCCEEDED,
            "Partial cited report generated." if budget_exhausted else "Cited report generated.",
            {
                "stage": "report",
                "report_id": report.id,
                "evidence_count": len(evidence),
                "citation_count": len(citations),
                "provider_call_count": len(provider_calls),
                "amount_spent": str(job.amount_spent.amount),
            },
        )
        return report

    def _settle_provider_call(self, job: ResearchJob, step: JobStep) -> tuple[ProviderCall, PaymentReceipt]:
        payload = {
            "job_id": job.id,
            "step_id": step.id,
            "provider_id": step.provider,
            "query": job.query,
            "purpose": step.title,
        }
        request_hash = hmac_digest(self.settings.hmac_secret, payload)
        call = ProviderCall(
            org_id=job.org_id,
            job_id=job.id,
            step_id=step.id,
            provider_id=step.provider or "internal-agent",
            status="payment_required",
            idempotency_key=hmac_digest(
                self.settings.hmac_secret,
                {"job_id": job.id, "step_id": step.id, "provider_id": step.provider},
            ),
            request_hash=request_hash,
        )
        terms = PaymentTerms(
            provider_id=call.provider_id,
            service=call.provider_id,
            purpose=step.title,
            amount=step.estimated_cost.amount,
            asset=job.max_spend.asset,
            network=job.max_spend.network,
            pay_to=self._provider_wallet(call.provider_id),
            resource=f"x402://research-agent/jobs/{job.id}/steps/{step.id}",
            expires_at=utcnow() + timedelta(minutes=10),
        )
        call.payment_terms = terms
        store.provider_calls[call.id] = call
        self._event(
            job,
            EventType.PAYMENT_REQUIRED,
            f"{call.provider_id} returned x402 payment terms.",
            {
                "stage": step.type,
                "step_id": step.id,
                "provider_call_id": call.id,
                "provider_id": call.provider_id,
                "amount": str(terms.amount),
                "asset": terms.asset,
                "network": terms.network,
            },
        )

        receipt_reference = f"x402-demo-{sha256(f'{call.id}:{request_hash}'.encode()).hexdigest()[:16]}"
        receipt = PaymentReceipt(
            org_id=job.org_id,
            provider_call_id=call.id,
            provider_id=call.provider_id,
            amount=Money(amount=terms.amount, asset=terms.asset, network=terms.network),
            receipt_reference=receipt_reference,
            receipt_hash=hmac_digest(
                self.settings.hmac_secret,
                {"call_id": call.id, "receipt_reference": receipt_reference, "amount": str(terms.amount)},
            ),
        )
        store.receipts[receipt.id] = receipt
        call.status = "paid"
        call.receipt_id = receipt.id
        store.provider_calls[call.id] = call
        self._event(
            job,
            EventType.PAID,
            "x402 payment settled and receipt stored.",
            {
                "stage": step.type,
                "step_id": step.id,
                "provider_call_id": call.id,
                "receipt_id": receipt.id,
                "provider_id": call.provider_id,
                "amount": str(receipt.amount.amount),
            },
        )
        return call, receipt

    def _evidence_for_step(
        self,
        job: ResearchJob,
        step: JobStep,
        call: ProviderCall,
        receipt: PaymentReceipt,
    ) -> list[EvidenceItem]:
        evidence_specs = self._evidence_specs(job, step)
        items: list[EvidenceItem] = []
        for index, spec in enumerate(evidence_specs, start=1):
            item = EvidenceItem(
                org_id=job.org_id,
                job_id=job.id,
                step_id=step.id,
                source_url=spec["source_url"],
                source_type=spec["source_type"],
                title=spec["title"],
                excerpt=spec["excerpt"],
                provider_call_id=call.id,
                payment_receipt_id=receipt.id,
            )
            store.evidence[item.id] = item
            items.append(item)
            self._event(
                job,
                EventType.RUNNING,
                f"Evidence captured from {call.provider_id}.",
                {
                    "stage": step.type,
                    "step_id": step.id,
                    "provider_call_id": call.id,
                    "receipt_id": receipt.id,
                    "evidence_item_id": item.id,
                    "source_type": item.source_type,
                    "rank": index,
                },
            )
        return items

    def _citations_for_evidence(self, evidence: list[EvidenceItem], step: JobStep) -> list[Citation]:
        citations: list[Citation] = []
        for index, item in enumerate(evidence):
            confidence = min(0.96, 0.86 + (index * 0.03))
            claim = self._claim_for_step(step, item)
            citations.append(Citation(evidence_item_id=item.id, claim=claim, confidence=confidence))
        return citations

    def _build_report(
        self,
        job: ResearchJob,
        plan: JobPlan,
        evidence: list[EvidenceItem],
        citations: list[Citation],
        provider_calls: list[ProviderCall],
        receipts: list[PaymentReceipt],
        budget_exhausted: bool,
    ) -> Report:
        source_lines = [
            f"- [{index}] {item.title} ({item.source_type}) - {item.excerpt}"
            for index, item in enumerate(evidence[:8], start=1)
        ] or ["- No evidence was captured before the run stopped."]
        payment_lines = [
            f"- {receipt.provider_id}: {receipt.amount.amount} {receipt.amount.asset} on {receipt.amount.network} ({receipt.receipt_reference})"
            for receipt in receipts
        ] or ["- No paid calls were settled."]
        step_lines = [
            f"- {step.type}: {step.status} via {step.provider or 'internal'}"
            for step in plan.steps
        ]
        status_note = (
            "The run returned a partial report because the configured spend cap prevented at least one paid provider call."
            if budget_exhausted
            else "The run completed within the configured spend cap."
        )

        markdown = (
            f"# Research report\n\n"
            f"**Query:** {job.query}\n\n"
            f"## Executive summary\n\n"
            f"The research agent planned {len(plan.steps)} steps, settled {len(receipts)} x402 payment(s), "
            f"captured {len(evidence)} evidence item(s), and generated {len(citations)} citation candidate(s). "
            f"{status_note}\n\n"
            f"## Evidence-backed findings\n\n"
            f"{chr(10).join(source_lines)}\n\n"
            f"## x402 payment record\n\n"
            f"{chr(10).join(payment_lines)}\n\n"
            f"## Workflow audit\n\n"
            f"{chr(10).join(step_lines)}\n"
        )
        limitations = [
            "Provider outputs are deterministic demo records until real paid APIs are connected.",
            "The orchestrator simulates x402 settlement but stores production-shaped payment receipts.",
            "Human approval gates must be enforced before enabling non-demo provider spending.",
        ]
        if budget_exhausted:
            limitations.insert(0, "The report is partial because at least one provider step exceeded the job budget.")

        return Report(
            org_id=job.org_id,
            job_id=job.id,
            title=f"Research report: {job.query[:80]}",
            summary=(
                f"Generated from {len(evidence)} evidence item(s), {len(provider_calls)} provider call(s), "
                f"and {len(receipts)} x402 receipt(s)."
            ),
            markdown=markdown,
            citations=citations,
            limitations=limitations,
        )

    def _event(self, job: ResearchJob, event_type: EventType, message: str, payload: dict | None = None) -> JobEvent:
        return store.add_event(
            JobEvent(
                org_id=job.org_id,
                job_id=job.id,
                type=event_type,
                message=message,
                payload=payload or {},
            )
        )

    def _evidence_specs(self, job: ResearchJob, step: JobStep) -> list[dict]:
        topic = self._topic(job.query)
        if step.type == StepType.SEARCH:
            return [
                {
                    "source_url": "https://example.com/research/search-result",
                    "source_type": "web",
                    "title": f"Search landscape for {topic}",
                    "excerpt": f"Search provider returned current web and news candidates relevant to {topic}.",
                },
                {
                    "source_url": "https://example.com/research/source-diversity",
                    "source_type": "news",
                    "title": f"Fresh source set for {topic}",
                    "excerpt": "Results include timestamps, publisher metadata, and enough context for downstream citation checks.",
                },
            ]
        if step.type == StepType.RETRIEVAL:
            return [
                {
                    "source_url": "https://example.com/research/retrieved-excerpts",
                    "source_type": "retrieval",
                    "title": f"Retrieved excerpts for {topic}",
                    "excerpt": "Retrieval worker captured bounded excerpts instead of asking the report writer to rely on unsupported memory.",
                }
            ]
        if step.type == StepType.SUMMARIZATION:
            return [
                {
                    "source_url": "https://example.com/research/source-summary",
                    "source_type": "summary",
                    "title": f"Source-grounded summary for {topic}",
                    "excerpt": "Summarization step compressed retrieved material while preserving citation anchors.",
                }
            ]
        if step.type == StepType.FACT_CHECKING:
            return [
                {
                    "source_url": "https://example.com/research/fact-check",
                    "source_type": "fact_check",
                    "title": f"Claim verification for {topic}",
                    "excerpt": "Fact-checking compared important claims against independent evidence and flagged uncertainty.",
                }
            ]
        if step.type == StepType.ENRICHMENT:
            return [
                {
                    "source_url": "https://example.com/research/enrichment",
                    "source_type": "structured_data",
                    "title": f"Structured enrichment for {topic}",
                    "excerpt": "Enrichment provider normalized entities, dates, prices, and other structured attributes.",
                }
            ]
        if step.type == StepType.WRITING:
            return [
                {
                    "source_url": "https://example.com/research/report-generator",
                    "source_type": "report_generation",
                    "title": f"Report generation trace for {topic}",
                    "excerpt": "Report generator compiled the final answer using only captured evidence and citation candidates.",
                }
            ]
        return []

    @staticmethod
    def _topic(query: str) -> str:
        words = [word.strip(".,?!:;").lower() for word in query.split() if len(word.strip(".,?!:;")) > 3]
        return " ".join(words[:6]) or "the research query"

    @staticmethod
    def _claim_for_step(step: JobStep, item: EvidenceItem) -> str:
        if step.type == StepType.FACT_CHECKING:
            return "Important claims were checked against independent evidence."
        if step.type == StepType.ENRICHMENT:
            return "Structured data was normalized before report generation."
        if step.type == StepType.WRITING:
            return "The report was generated from captured evidence and citation candidates."
        return f"{item.title} supports the report's source-grounded analysis."

    @staticmethod
    def _step_started_message(step: JobStep) -> str:
        if step.provider:
            return f"Starting {step.type} with {step.provider}."
        return f"Starting {step.type}."

    @staticmethod
    def _step_completed_message(step: JobStep, evidence: list[EvidenceItem]) -> str:
        if evidence:
            return f"{step.provider} completed and produced {len(evidence)} evidence item(s)."
        return f"{step.type} completed."

    @staticmethod
    def _provider_wallet(provider_id: str) -> str:
        digest = sha256(provider_id.encode()).hexdigest()[:40]
        return f"0x{digest}"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
