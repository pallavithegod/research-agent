from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.api.deps import current_auth, get_job_for_org
from app.core.clerk_auth import AuthContext
from app.core.config import get_settings
from app.domain.enums import ApprovalScope, EventType
from app.domain.schemas import JobEvent, X402CallCreate, X402PaymentSubmit, utcnow
from app.services.payment_policy import PaymentPolicyService
from app.services.tool_gateway import X402ProtocolError, tool_gateway_service
from app.storage.memory import store

router = APIRouter(prefix="/tool-calls", tags=["tool-calls"])


@router.post("", response_model=None)
def create_tool_call(payload: X402CallCreate, auth: AuthContext = Depends(current_auth)):
    job = get_job_for_org(payload.job_id, auth)
    try:
        call, result = tool_gateway_service.request_quote(org_id=auth.org_id, payload=payload)
        if call.payment_terms:
            PaymentPolicyService(get_settings()).validate_offer(call.payment_terms, job)
        store.provider_calls[call.id] = call
    except X402ProtocolError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    if call.status == "payment_required":
        store.add_event(JobEvent(
            org_id=auth.org_id,
            job_id=job.id,
            type=EventType.PAYMENT_REQUIRED,
            message="An allow-listed provider returned x402 payment terms.",
            payload={"call_id": call.id, "provider_id": call.provider_id, "amount": str(call.payment_terms.amount)},
        ))
        return JSONResponse(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            content={
                "call": call.model_dump(mode="json"),
                "payment_required": True,
                "next": "Create and confirm a scoped approval, then sign these terms in the user's wallet.",
            },
        )
    return {"call": call, "result": result, "payment_required": False}


@router.post("/{call_id}/pay")
def pay_tool_call(
    call_id: str,
    payload: X402PaymentSubmit,
    auth: AuthContext = Depends(current_auth),
) -> dict:
    call = store.provider_calls.get(call_id)
    if not call or call.org_id != auth.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider call not found")
    job = get_job_for_org(call.job_id, auth)
    approval = store.approvals.get(payload.approval_id)
    if not approval or approval.org_id != auth.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment approval not found")
    if not call.payment_terms:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Provider call has no payment terms")
    if approval.scope == ApprovalScope.ONE_REQUEST and approval.step_id != call.step_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Approval is not scoped to this provider call")

    PaymentPolicyService(get_settings()).validate_terms(call.payment_terms, job, [approval])
    try:
        receipt, result = tool_gateway_service.settle(call, payload.payment_signature)
    except X402ProtocolError as exc:
        call.status = "failed"
        store.provider_calls[call.id] = call
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    store.receipts[receipt.id] = receipt
    store.provider_calls[call.id] = call
    if approval.scope == ApprovalScope.ONE_REQUEST:
        approval.consumed_at = utcnow()
        store.approvals[approval.id] = approval
    job.amount_spent.amount += call.payment_terms.amount
    store.jobs[job.id] = job
    store.add_event(JobEvent(
        org_id=auth.org_id,
        job_id=job.id,
        type=EventType.PAID,
        message="x402 payment settled and the provider receipt was stored.",
        payload={"call_id": call.id, "receipt_id": receipt.id, "amount": str(receipt.amount.amount)},
    ))
    return {"call": call, "receipt": receipt, "result": result}
