from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_auth, get_job_for_org
from app.core.clerk_auth import AuthContext
from app.domain.schemas import PaymentApproval, PaymentApprovalCreate, PaymentPinVerify
from app.services.payment_pin import payment_pin_service
from app.storage.memory import store

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_approval(payload: PaymentApprovalCreate, auth: AuthContext = Depends(current_auth)) -> dict:
    get_job_for_org(payload.job_id, auth)
    approval = PaymentApproval(
        org_id=auth.org_id,
        user_id=auth.user_id,
        job_id=payload.job_id,
        step_id=payload.step_id,
        scope=payload.scope,
        provider_id=payload.provider_id,
        max_amount=payload.max_amount,
        purpose=payload.purpose,
        expires_at=payload.expires_at,
    )
    store.approvals[approval.id] = approval
    return {"approval": approval}


@router.post("/{approval_id}/confirm")
def confirm_approval(approval_id: str, payload: PaymentPinVerify, auth: AuthContext = Depends(current_auth)) -> dict:
    approval = store.approvals.get(approval_id)
    if not approval or approval.org_id != auth.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")
    payment_pin_service.verify_pin(auth.org_id, auth.user_id, payload.pin)
    approval.confirmed_at = datetime.now(timezone.utc)
    store.approvals[approval.id] = approval
    return {"approval": approval}

