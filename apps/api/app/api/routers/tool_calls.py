from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_auth, get_job_for_org
from app.core.clerk_auth import AuthContext
from app.core.config import Settings, get_settings
from app.core.security import hmac_digest
from app.domain.enums import EventType
from app.domain.schemas import JobEvent, Money, PaymentReceipt
from app.services.payment_policy import PaymentPolicyService
from app.services.tool_gateway import tool_gateway_service
from app.storage.memory import store

router = APIRouter(prefix="/tool-calls", tags=["tool-calls"])


@router.post("")
def create_tool_call(
    payload: dict,
    auth: AuthContext = Depends(current_auth),
    settings: Settings = Depends(get_settings),
) -> dict:
    job_id = str(payload.get("job_id") or "")
    step_id = str(payload.get("step_id") or "")
    provider_id = str(payload.get("provider_id") or "")
    if not job_id or not step_id or not provider_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="job_id, step_id, and provider_id are required")
    get_job_for_org(job_id, auth)
    call = tool_gateway_service.create_provider_call(
        org_id=auth.org_id,
        job_id=job_id,
        step_id=step_id,
        provider_id=provider_id,
        payload=payload,
        hmac_secret=settings.hmac_secret,
    )
    call.payment_terms = tool_gateway_service.mock_payment_terms(call, purpose=str(payload.get("purpose") or "research step"))
    call.status = "payment_required"
    store.provider_calls[call.id] = call
    store.add_event(
        JobEvent(
            org_id=auth.org_id,
            job_id=job_id,
            type=EventType.PAYMENT_REQUIRED,
            message="Provider returned x402 payment terms.",
            payload={"call_id": call.id, "provider_id": provider_id, "amount": str(call.payment_terms.amount)},
        )
    )
    return {"provider_call": call}


@router.post("/{call_id}/pay")
def pay_tool_call(
    call_id: str,
    payload: dict,
    auth: AuthContext = Depends(current_auth),
    settings: Settings = Depends(get_settings),
) -> dict:
    call = store.provider_calls.get(call_id)
    if not call or call.org_id != auth.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider call not found")
    if not call.payment_terms:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Provider call does not require payment")
    job = get_job_for_org(call.job_id, auth)
    approvals = [approval for approval in store.approvals.values() if approval.org_id == auth.org_id]
    PaymentPolicyService(settings).validate_terms(call.payment_terms, job, approvals)

    receipt_ref = str(payload.get("receipt_reference") or f"mock-receipt-{call.id}")
    receipt = PaymentReceipt(
        org_id=auth.org_id,
        provider_call_id=call.id,
        provider_id=call.provider_id,
        amount=Money(amount=call.payment_terms.amount, asset=call.payment_terms.asset, network=call.payment_terms.network),
        receipt_reference=receipt_ref,
        receipt_hash=hmac_digest(settings.hmac_secret, {"call_id": call.id, "receipt_reference": receipt_ref}),
    )
    store.receipts[receipt.id] = receipt
    call.status = "paid"
    call.receipt_id = receipt.id
    store.provider_calls[call.id] = call
    job.amount_spent.amount += call.payment_terms.amount
    store.jobs[job.id] = job
    store.add_event(
        JobEvent(
            org_id=auth.org_id,
            job_id=job.id,
            type=EventType.PAID,
            message="x402 payment receipt verified and stored.",
            payload={"receipt_id": receipt.id, "amount": str(call.payment_terms.amount)},
        )
    )
    return {"provider_call": call, "receipt": receipt}
