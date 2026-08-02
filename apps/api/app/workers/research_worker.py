from app.services.job_queue import job_queue_service


def poll_once() -> dict | None:
    """Fetch one queued research job payload.

    Real research execution will be attached here after the orchestrator is moved
    out of the request-response API.
    """
    return job_queue_service.dequeue_research_job()
