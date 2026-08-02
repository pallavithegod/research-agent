import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.deps import current_auth, get_job_for_org
from app.core.clerk_auth import AuthContext
from app.domain.enums import EventType, JobStatus
from app.domain.schemas import JobEvent, ResearchJob, ResearchJobCreate
from app.services.orchestrator import orchestrator_service
from app.services.planner import planner_service
from app.storage.memory import store

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_job(payload: ResearchJobCreate, auth: AuthContext = Depends(current_auth)) -> dict:
    job = ResearchJob(
        org_id=auth.org_id,
        user_id=auth.user_id,
        query=payload.query,
        locale=payload.locale,
        output_format=payload.output_format,
        max_spend=payload.max_spend,
        require_citations=payload.require_citations,
    )
    plan = planner_service.create_plan(job)
    job.status = JobStatus.PLANNED
    job.plan_id = plan.id
    store.jobs[job.id] = job
    store.plans[plan.id] = plan
    store.add_event(JobEvent(org_id=auth.org_id, job_id=job.id, type=EventType.PLANNED, message="Research plan created."))
    return {"job": job, "plan": plan}


@router.get("")
def list_jobs(auth: AuthContext = Depends(current_auth)) -> dict:
    return {"data": store.org_jobs(auth.org_id)}


@router.get("/{job_id}")
def get_job(job_id: str, auth: AuthContext = Depends(current_auth)) -> dict:
    job = get_job_for_org(job_id, auth)
    plan = store.plans.get(job.plan_id or "")
    report = store.reports.get(job.report_id or "")
    return {"job": job, "plan": plan, "report": report}


@router.post("/{job_id}/run")
def run_job(job_id: str, auth: AuthContext = Depends(current_auth)) -> dict:
    job = get_job_for_org(job_id, auth)
    report = orchestrator_service.start_job(job)
    return {"job": store.jobs[job.id], "report": report}


@router.post("/{job_id}/cancel")
def cancel_job(job_id: str, auth: AuthContext = Depends(current_auth)) -> dict:
    job = get_job_for_org(job_id, auth)
    if job.status in {JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.CANCELLED}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job is already terminal")
    job.status = JobStatus.CANCELLED
    store.jobs[job.id] = job
    event = store.add_event(JobEvent(org_id=auth.org_id, job_id=job.id, type=EventType.CANCELLED, message="Job cancelled."))
    return {"job": job, "event": event}


@router.get("/{job_id}/events")
async def job_events(job_id: str, auth: AuthContext = Depends(current_auth)) -> StreamingResponse:
    get_job_for_org(job_id, auth)

    async def stream():
        last_index = 0
        while True:
            events = store.events.get(job_id, [])
            for event in events[last_index:]:
                yield f"event: {event.type}\ndata: {event.model_dump_json()}\n\n"
            last_index = len(events)
            await asyncio.sleep(1)

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/{job_id}/audit")
def job_audit(job_id: str, auth: AuthContext = Depends(current_auth)) -> dict:
    job = get_job_for_org(job_id, auth)
    evidence = [item for item in store.evidence.values() if item.job_id == job.id and item.org_id == auth.org_id]
    receipts = [receipt for receipt in store.receipts.values() if receipt.org_id == auth.org_id]
    return {
        "job": job,
        "events": store.events.get(job.id, []),
        "evidence": evidence,
        "payment_receipts": receipts,
    }
