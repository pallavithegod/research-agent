import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse

from app.api.deps import current_auth, get_job_for_org
from app.core.clerk_auth import AuthContext
from app.domain.enums import EventType, JobStatus
from app.domain.schemas import (
    AutomationDecision,
    AutomationDecisionCreate,
    ClarificationResponse,
    JobEvent,
    Report,
    ResearchFeedback,
    ResearchFeedbackCreate,
    ResearchJob,
    ResearchJobCreate,
    new_id,
    utcnow,
)
from app.services.orchestrator import orchestrator_service
from app.services.planner import planner_service
from app.services.research_graph import research_graph_service
from app.services.browser_research import BrowserResearchError, browser_research_service
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
        research_mode=payload.research_mode,
        source_policy=payload.source_policy,
    )
    questions = planner_service.clarification_questions(job)
    job.clarification_questions = questions
    store.jobs[job.id] = job
    if questions:
        job.status = JobStatus.AWAITING_INPUT
        store.jobs[job.id] = job
        store.add_event(JobEvent(org_id=auth.org_id, job_id=job.id, type=EventType.CLARIFICATION_REQUIRED, message="A focused clarification is needed before planning can begin."))
        return {"job": job, "plan": None, "clarification_questions": questions}

    plan = planner_service.create_plan(job)
    job.status = JobStatus.PLANNED
    job.plan_id = plan.id
    store.jobs[job.id] = job
    store.plans[plan.id] = plan
    store.add_event(JobEvent(org_id=auth.org_id, job_id=job.id, type=EventType.PLANNED, message="Research plan created."))
    return {"job": job, "plan": plan, "clarification_questions": []}


@router.get("")
def list_jobs(auth: AuthContext = Depends(current_auth)) -> dict:
    return {"data": store.org_jobs(auth.org_id)}


@router.get("/{job_id}")
def get_job(job_id: str, auth: AuthContext = Depends(current_auth)) -> dict:
    job = get_job_for_org(job_id, auth)
    plan = store.plans.get(job.plan_id or "")
    report = store.reports.get(job.report_id or "")
    report_history = sorted(
        [item for item in store.reports.values() if item.job_id == job.id and item.org_id == auth.org_id],
        key=lambda item: item.revision,
    )
    provider_calls = [call for call in store.provider_calls.values() if call.job_id == job.id and call.org_id == auth.org_id]
    receipt_ids = {call.receipt_id for call in provider_calls if call.receipt_id}
    receipts = [receipt for receipt in store.receipts.values() if receipt.id in receipt_ids and receipt.org_id == auth.org_id]
    evidence = [item for item in store.evidence.values() if item.job_id == job.id and item.org_id == auth.org_id]
    return {
        "job": job,
        "plan": plan,
        "report": report,
        "report_history": report_history,
        "evidence": evidence,
        "provider_calls": provider_calls,
        "payment_receipts": receipts,
    }


@router.post("/{job_id}/clarifications")
def answer_clarifications(job_id: str, payload: ClarificationResponse, auth: AuthContext = Depends(current_auth)) -> dict:
    job = get_job_for_org(job_id, auth)
    if job.status != JobStatus.AWAITING_INPUT:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This job is not waiting for clarification")
    required_ids = {question.id for question in job.clarification_questions if question.required}
    if not required_ids.issubset(payload.answers):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Answer each required clarification before continuing")

    job.clarification_answers = payload.answers
    plan = planner_service.create_plan(job)
    job.clarification_questions = []
    job.status = JobStatus.PLANNED
    job.plan_id = plan.id
    store.jobs[job.id] = job
    store.plans[plan.id] = plan
    store.add_event(JobEvent(org_id=auth.org_id, job_id=job.id, type=EventType.PLANNED, message="Clarifications received and research plan created."))
    return {"job": job, "plan": plan}


@router.post("/{job_id}/decisions", status_code=status.HTTP_201_CREATED)
def record_automation_decision(
    job_id: str,
    payload: AutomationDecisionCreate,
    auth: AuthContext = Depends(current_auth),
) -> dict:
    job = get_job_for_org(job_id, auth)
    decision = AutomationDecision(**payload.model_dump())
    job.automation_decisions = [
        existing for existing in job.automation_decisions if existing.kind != decision.kind
    ] + [decision]
    store.jobs[job.id] = job
    store.add_event(
        JobEvent(
            org_id=auth.org_id,
            job_id=job.id,
            type=EventType.RUNNING,
            message=f"User selected {decision.label} from the product shortlist.",
            payload={"decision_id": decision.id, "kind": decision.kind, "selection_id": decision.selection_id},
        )
    )
    return {"job": job, "decision": decision}


@router.post("/{job_id}/feedback", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    job_id: str,
    payload: ResearchFeedbackCreate,
    auth: AuthContext = Depends(current_auth),
) -> dict:
    job = get_job_for_org(job_id, auth)
    report = store.reports.get(job.report_id or "")
    if not report:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Feedback can be submitted after the job has produced a report",
        )

    feedback = ResearchFeedback(
        org_id=auth.org_id,
        user_id=auth.user_id,
        job_id=job.id,
        **payload.model_dump(),
    )
    evidence = [
        item for item in store.evidence.values() if item.job_id == job.id and item.org_id == auth.org_id
    ]
    outcome = research_graph_service.apply_feedback(job, report, feedback, evidence)
    feedback.revision_status = outcome.get("revision_status", "failed")
    revised_report: Report | None = None

    if feedback.revision_status == "revised":
        revised_report = report.model_copy(
            deep=True,
            update={
                "id": new_id("rpt"),
                "summary": outcome["revised_summary"],
                "markdown": outcome["revised_markdown"],
                "revision": report.revision + 1,
                "supersedes_report_id": report.id,
                "model_provider": "deepseek",
                "created_at": utcnow(),
            },
        )
        revised_report.limitations = list(
            dict.fromkeys(revised_report.limitations + ["This revision incorporates explicit user feedback."])
        )
        store.reports[revised_report.id] = revised_report
        job.report_id = revised_report.id
        feedback.revision_report_id = revised_report.id

    job.feedback.append(feedback)
    job.updated_at = utcnow()
    store.jobs[job.id] = job
    store.add_event(
        JobEvent(
            org_id=auth.org_id,
            job_id=job.id,
            type=EventType.REPORT_REVISED if revised_report else EventType.FEEDBACK_RECEIVED,
            message="Report revised from user feedback." if revised_report else "User feedback recorded.",
            payload={
                "feedback_id": feedback.id,
                "rating": feedback.rating,
                "request_revision": feedback.request_revision,
                "revision_status": feedback.revision_status,
                "revision_report_id": feedback.revision_report_id,
            },
        )
    )
    return {
        "job": job,
        "feedback": feedback,
        "report": revised_report or report,
        "revision_error": outcome.get("error"),
    }


@router.post("/{job_id}/run")
def run_job(job_id: str, auth: AuthContext = Depends(current_auth)) -> dict:
    job = get_job_for_org(job_id, auth)
    if job.status == JobStatus.AWAITING_INPUT:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Answer the clarification question before starting this job")
    if job.status in {JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.CANCELLED, JobStatus.PARTIAL, JobStatus.BUDGET_EXHAUSTED}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job is already terminal")
    try:
        report = orchestrator_service.start_job(job)
    except (BrowserResearchError, ValueError) as exc:
        job.status = JobStatus.FAILED
        job.updated_at = utcnow()
        store.jobs[job.id] = job
        store.add_event(
            JobEvent(
                org_id=auth.org_id,
                job_id=job.id,
                type=EventType.FAILED,
                message=str(exc),
                payload={"stage": "research"},
            )
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"job": store.jobs[job.id], "report": report}


@router.get("/{job_id}/automation/{observation_id}/screenshot")
def automation_screenshot(
    job_id: str,
    observation_id: str,
    auth: AuthContext = Depends(current_auth),
) -> FileResponse:
    job = get_job_for_org(job_id, auth)
    observation = next((item for item in job.browser_observations if item.id == observation_id), None)
    if not observation or not observation.screenshot_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation screenshot not found")
    path = browser_research_service.screenshot_path(job.id, observation.id)
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation screenshot not found")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "private, max-age=60"})


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
    provider_calls = [call for call in store.provider_calls.values() if call.job_id == job.id and call.org_id == auth.org_id]
    receipt_ids = {call.receipt_id for call in provider_calls if call.receipt_id}
    receipts = [receipt for receipt in store.receipts.values() if receipt.id in receipt_ids and receipt.org_id == auth.org_id]
    return {
        "job": job,
        "events": store.events.get(job.id, []),
        "evidence": evidence,
        "provider_calls": provider_calls,
        "payment_receipts": receipts,
    }
