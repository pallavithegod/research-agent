import logging
import time
from typing import Any

from app.core.config import get_settings
from app.core.observability import configure_logging
from app.domain.enums import JobStatus
from app.services.job_queue import job_queue_service
from app.services.orchestrator import orchestrator_service
from app.storage.memory import store

logger = logging.getLogger("app.worker.research")

TERMINAL_STATUSES = {
    JobStatus.SUCCEEDED,
    JobStatus.FAILED,
    JobStatus.CANCELLED,
    JobStatus.BUDGET_EXHAUSTED,
}


def poll_once() -> dict[str, Any] | None:
    """Fetch one queued research job payload."""
    return job_queue_service.dequeue_research_job()


def process_once() -> bool:
    payload = poll_once()
    if not payload:
        return False

    job_id = str(payload.get("job_id") or "")
    if not job_id:
        logger.warning("queue_payload_missing_job_id", extra={"event": "queue_payload_missing_job_id"})
        return False

    job = store.jobs.get(job_id)
    if not job:
        logger.warning("queued_job_not_found", extra={"event": "queued_job_not_found", "job_id": job_id})
        return False

    if job.status in TERMINAL_STATUSES:
        logger.info(
            "queued_job_already_terminal",
            extra={"event": "queued_job_already_terminal", "job_id": job.id, "status": job.status},
        )
        return False

    logger.info("queued_job_started", extra={"event": "queued_job_started", "job_id": job.id})
    orchestrator_service.run_research(job)
    logger.info("queued_job_completed", extra={"event": "queued_job_completed", "job_id": job.id})
    return True


def run_forever() -> None:
    settings = get_settings()
    settings.validate_production()
    configure_logging(settings)

    if not job_queue_service.is_enabled:
        raise RuntimeError("Research worker requires JOB_QUEUE_BACKEND=upstash.")

    if settings.storage_backend == "mongodb":
        store.ping()

    logger.info(
        "research_worker_started",
        extra={
            "event": "research_worker_started",
            "queue_name": settings.research_job_queue_name,
            "poll_seconds": settings.worker_poll_seconds,
        },
    )

    while True:
        processed = process_once()
        if not processed:
            time.sleep(settings.worker_poll_seconds)


if __name__ == "__main__":
    run_forever()
