from app.core.config import get_settings
from app.domain.enums import EventType, JobStatus
from app.domain.schemas import JobEvent, Report, ResearchJob
from app.services.job_queue import job_queue_service
from app.services.research_domain import ResearchDomainService
from app.services.research_graph import research_graph_service
from app.storage.memory import store


class OrchestratorService:
    """Synchronous MVP executor. Replace with durable workers/queues before production."""

    def __init__(self) -> None:
        self.research_domain = ResearchDomainService(get_settings())

    def start_job(self, job: ResearchJob) -> Report | None:
        if job.status in {JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.CANCELLED, JobStatus.PARTIAL, JobStatus.BUDGET_EXHAUSTED}:
            raise ValueError("Cannot execute a terminal job")
        if job.status == JobStatus.AWAITING_INPUT:
            raise ValueError("Cannot execute a job waiting for clarification")
        if job_queue_service.is_enabled:
            self.queue_job(job)
            job_queue_service.enqueue_research_job(job)
            return None
        return self.run_research(job)

    def queue_job(self, job: ResearchJob) -> ResearchJob:
        job.status = JobStatus.QUEUED
        store.jobs[job.id] = job
        store.add_event(
            JobEvent(org_id=job.org_id, job_id=job.id, type=EventType.RUNNING, message="Job queued for execution.")
        )
        return job

    def run_research(self, job: ResearchJob) -> Report:
        report, review = research_graph_service.execute(
            job,
            self.research_domain.run_research,
            lambda current_job: [
                item
                for item in store.evidence.values()
                if item.job_id == current_job.id and item.org_id == current_job.org_id
            ],
        )
        store.reports[report.id] = report
        job.quality_reviews.append(review)
        if not review.passed:
            job.status = JobStatus.PARTIAL
            report.limitations = list(dict.fromkeys(report.limitations + review.issues))
            store.reports[report.id] = report
        store.jobs[job.id] = job
        store.add_event(
            JobEvent(
                org_id=job.org_id,
                job_id=job.id,
                type=EventType.QUALITY_REVIEWED,
                message="Report passed the evidence quality gate." if review.passed else "Report requires review.",
                payload={
                    "report_id": report.id,
                    "review_id": review.id,
                    "passed": review.passed,
                    "reviewer": review.reviewer,
                    "issues": review.issues,
                },
            )
        )
        return report

orchestrator_service = OrchestratorService()
