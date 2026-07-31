from fastapi import APIRouter, Depends, status

from app.api.deps import current_auth
from app.core.clerk_auth import AuthContext
from app.domain.schemas import PaymentPinCreate, PaymentPinVerify
from app.services.payment_pin import payment_pin_service

router = APIRouter(prefix="/payment-pin", tags=["payment-pin"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_pin(payload: PaymentPinCreate, auth: AuthContext = Depends(current_auth)) -> dict:
    payment_pin_service.set_pin(auth.org_id, auth.user_id, payload.pin)
    return {"status": "configured"}


@router.post("/verify")
def verify_pin(payload: PaymentPinVerify, auth: AuthContext = Depends(current_auth)) -> dict:
    payment_pin_service.verify_pin(auth.org_id, auth.user_id, payload.pin)
    return {"status": "verified"}

