from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_auth
from app.core.clerk_auth import AuthContext
from app.domain.schemas import CheckoutIntentCreate, CheckoutReviewConfirm, ProductSearchCreate

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/search")
def product_search(payload: ProductSearchCreate, auth: AuthContext = Depends(current_auth)) -> dict:
    return {
        "query": payload.query,
        "policy": {
            "checkout_enabled": False,
            "autonomous_purchase": False,
            "reason": "Research MVP returns comparisons and monitoring only.",
        },
        "offers": [
            {
                "id": "offer_mock_1",
                "title": "Mock product option",
                "price": "1299.00",
                "currency": "USD",
                "freshness": "estimate",
                "source_url": "https://example.com/product",
                "assumptions": payload.requirements,
            }
        ],
    }


@router.post("/price-watches")
def create_price_watch(payload: dict, auth: AuthContext = Depends(current_auth)) -> dict:
    return {"status": "created", "watch": payload, "checkout_handoff_only": True}


@router.post("/checkout-intents", status_code=status.HTTP_202_ACCEPTED)
def create_checkout_intent(payload: CheckoutIntentCreate, auth: AuthContext = Depends(current_auth)) -> dict:
    return {
        "status": "review_required",
        "intent": payload,
        "policy": "Checkout is approval-gated and disabled for autonomous execution in this scaffold.",
    }


@router.post("/checkout-reviews/{review_id}/confirm")
def confirm_checkout_review(review_id: str, payload: CheckoutReviewConfirm, auth: AuthContext = Depends(current_auth)) -> dict:
    if not payload.accept_terms:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Terms must be accepted")
    return {
        "review_id": review_id,
        "status": "handoff_required",
        "message": "Merchant checkout must be completed by the user in a trusted flow.",
    }

