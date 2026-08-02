from app.core.config import get_settings
from app.domain.enums import EventType, JobStatus
from app.domain.schemas import JobEvent, Report, ResearchJob
from app.services.job_queue import job_queue_service
from app.services.research_domain import ResearchDomainService
from app.storage.memory import store


class OrchestratorService:
    """Synchronous MVP executor. Replace with durable workers/queues before production."""

    def __init__(self) -> None:
        self.research_domain = ResearchDomainService(get_settings())

    def start_job(self, job: ResearchJob) -> Report | None:
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
        return self.research_domain.run_research(job)

    def run_mock_research(self, job: ResearchJob) -> Report:
        """Backward-compatible alias for existing worker/tests."""
        return self.run_research(job)


orchestrator_service = OrchestratorService()
