"""Evidence collection backed by multi-provider search and multi-site parsing."""

from datetime import datetime, timezone

from app.core.config import Settings
from app.domain.enums import EventType, JobStatus, StepType
from app.domain.schemas import BrowserObservation, Citation, EvidenceItem, JobEvent, Report, ResearchJob
from app.services.web_research import WebResearchService, web_research_service
from app.storage.memory import store


class ResearchDomainService:
    def __init__(self, settings: Settings, browser: WebResearchService | None = None) -> None:
        self.settings = settings
        self.browser = browser or web_research_service

    def run_research(self, job: ResearchJob) -> Report:
        plan = store.plans.get(job.plan_id or "")
        if not plan:
            raise ValueError("Cannot run job without a research plan.")

        job.status = JobStatus.RUNNING
        job.updated_at = utcnow()
        store.jobs[job.id] = job
        self._event(job, EventType.RUNNING, "Multi-source web research started.", {"stage": "research"})

        search_step = next((step for step in plan.steps if step.type == StepType.SEARCH), plan.steps[0])
        limit_by_mode = {"quick": 4, "deep": 8, "compare": 10}
        limit = min(limit_by_mode[job.research_mode], self.settings.browser_max_sources)
        query = self._search_query(job)

        def observe(
            action: str,
            message: str,
            url: str | None,
            title: str | None,
            screenshot: bytes | None,
            observation_status: str,
        ) -> None:
            observation = BrowserObservation(
                action=action,
                message=message,
                url=url,
                title=title,
                status=observation_status,
            )
            if screenshot:
                observation.screenshot_url = None
            job.browser_observations.append(observation)
            job.updated_at = utcnow()
            store.jobs[job.id] = job
            self._event(
                job,
                EventType.RUNNING if observation_status != "failed" else EventType.RETRYING,
                message,
                {
                    "stage": "research",
                    "observation_id": observation.id,
                    "action": action,
                    "status": observation_status,
                    "url": url,
                    "title": title,
                    "screenshot_url": observation.screenshot_url,
                },
            )

        live_sources = self.browser.search_and_retrieve(query, limit=limit, observe=observe)
        evidence: list[EvidenceItem] = []
        citations: list[Citation] = []
        for source in live_sources:
            if not self._source_allowed(job, source.url):
                continue
            item = EvidenceItem(
                org_id=job.org_id,
                job_id=job.id,
                step_id=search_step.id,
                source_url=source.url,
                source_type="live_web",
                title=source.title,
                excerpt=source.excerpt,
                image_url=source.image_url,
            )
            store.evidence[item.id] = item
            evidence.append(item)
            citations.append(
                Citation(
                    evidence_item_id=item.id,
                    claim=f"Source evidence from {item.title}.",
                    confidence=0.85,
                )
            )

        if not evidence:
            raise ValueError("All live results were excluded by the configured source policy.")

        report = Report(
            org_id=job.org_id,
            job_id=job.id,
            title=f"Research: {job.query[:100]}",
            summary=f"Collected {len(evidence)} live sources. The answer is being synthesized from those sources.",
            markdown=self._evidence_markdown(job, evidence),
            citations=citations,
            limitations=[],
            suggested_follow_ups=[],
        )
        store.reports[report.id] = report
        job.report_id = report.id
        job.status = JobStatus.SUCCEEDED
        job.updated_at = utcnow()
        store.jobs[job.id] = job
        self._event(
            job,
            EventType.SUCCEEDED,
            "Live evidence collection completed.",
            {"report_id": report.id, "evidence_count": len(evidence)},
        )
        return report

    @staticmethod
    def _search_query(job: ResearchJob) -> str:
        constraints = " ".join(job.clarification_answers.values())
        query = f"{job.query} {constraints}".strip()
        if any(term in job.query.lower() for term in (
            "laptop", "notebook", "computer", "phone", "smartphone", "mobile", "tablet", "product",
            "headphone", "earbud", "speaker", "monitor", "television", "camera", "smartwatch", "watch",
            "keyboard", "mouse", "printer", "router", "console", "shoe", "sneaker", "appliance",
            "refrigerator", "washing machine", "air conditioner", "buy", "price", "shopping",
        )):
            return f"{query} current price specifications official retailer"
        return query

    @staticmethod
    def _evidence_markdown(job: ResearchJob, evidence: list[EvidenceItem]) -> str:
        findings = "\n".join(f"- **{item.title}:** {item.excerpt[:260]}" for item in evidence)
        return f"# Research findings\n\n**Question:** {job.query}\n\n## What the evidence shows\n\n{findings}"

    @staticmethod
    def _source_allowed(job: ResearchJob, source_url: str) -> bool:
        from urllib.parse import urlparse

        domain = (urlparse(source_url).hostname or "").lower().removeprefix("www.")
        blocked = {item.lower().removeprefix("www.") for item in job.source_policy.blocked_domains}
        allowed = {item.lower().removeprefix("www.") for item in job.source_policy.allowed_domains}
        if any(domain == item or domain.endswith(f".{item}") for item in blocked):
            return False
        return not allowed or any(domain == item or domain.endswith(f".{item}") for item in allowed)

    @staticmethod
    def _event(job: ResearchJob, event_type: EventType, message: str, payload: dict | None = None) -> JobEvent:
        return store.add_event(
            JobEvent(
                org_id=job.org_id,
                job_id=job.id,
                type=event_type,
                message=message,
                payload=payload or {},
            )
        )


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
