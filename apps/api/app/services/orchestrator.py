from decimal import Decimal

from app.domain.enums import EventType, JobStatus
from app.domain.schemas import Citation, EvidenceItem, JobEvent, Report, ResearchJob
from app.services.job_queue import job_queue_service
from app.storage.memory import store


class OrchestratorService:
    """Synchronous MVP executor. Replace with durable workers/queues before production."""

    def start_job(self, job: ResearchJob) -> Report | None:
        if job_queue_service.is_enabled:
            self.queue_job(job)
            job_queue_service.enqueue_research_job(job)
            return None
        return self.run_mock_research(job)

    def queue_job(self, job: ResearchJob) -> ResearchJob:
        job.status = JobStatus.QUEUED
        store.jobs[job.id] = job
        store.add_event(
            JobEvent(org_id=job.org_id, job_id=job.id, type=EventType.RUNNING, message="Job queued for execution.")
        )
        return job

    def run_mock_research(self, job: ResearchJob) -> Report:
        job.status = JobStatus.RUNNING
        store.jobs[job.id] = job
        store.add_event(JobEvent(org_id=job.org_id, job_id=job.id, type=EventType.RUNNING, message="Research run started."))

        evidence = EvidenceItem(
            org_id=job.org_id,
            job_id=job.id,
            step_id="mock_step",
            title="Mock source bundle",
            excerpt="This placeholder evidence represents source excerpts captured by retrieval workers.",
            source_type="mock",
        )
        store.evidence[evidence.id] = evidence
        citation = Citation(evidence_item_id=evidence.id, claim="The report is generated from captured evidence.", confidence=0.91)
        report = Report(
            org_id=job.org_id,
            job_id=job.id,
            title=f"Research report: {job.query[:80]}",
            summary="Mock cited report generated from the planned multi-step workflow.",
            markdown=(
                f"# Research report\n\nQuery: {job.query}\n\n"
                "This MVP backend records the workflow, evidence, citation, and audit structure. "
                "Connect real providers through the tool gateway before production use."
            ),
            citations=[citation],
            limitations=[
                "This is a scaffolded mock result.",
                "No real paid providers were called.",
                "Payment and source receipts must be verified before production reporting.",
            ],
        )
        store.reports[report.id] = report
        job.report_id = report.id
        job.status = JobStatus.SUCCEEDED
        job.amount_spent.amount = Decimal("0.00")
        store.jobs[job.id] = job
        store.add_event(JobEvent(org_id=job.org_id, job_id=job.id, type=EventType.SUCCEEDED, message="Report generated."))
        return report


orchestrator_service = OrchestratorService()
