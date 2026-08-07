from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_auth, get_job_for_org
from app.core.clerk_auth import AuthContext
from app.core.config import get_settings
from app.domain.schemas import AutomationDecision, CheckoutIntentCreate, CheckoutReviewConfirm, ProductPurchaseRequest, ProductSearchCreate, ProductSelectionResearchRequest, X402CallCreate
from app.services.browser_research import BrowserResearchError
from app.services.payment_policy import PaymentPolicyService
from app.services.deepseek import DeepSeekError, deepseek_client
from app.services.tool_gateway import X402ProtocolError, tool_gateway_service
from app.services.web_research import web_research_service
from app.storage.memory import store

router = APIRouter(prefix="/products", tags=["products"])


def _selected_product(payload: ProductSelectionResearchRequest | ProductPurchaseRequest, auth: AuthContext):
    job = get_job_for_org(payload.job_id, auth)
    report = store.reports.get(job.report_id or "")
    if not report:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The product report is not ready")
    product = next((item for item in report.products if item.id == payload.product_id), None)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected product was not found in this report")
    return job, report, product


@router.post("/search")
def product_search(payload: ProductSearchCreate, auth: AuthContext = Depends(current_auth)) -> dict:
    query = " ".join(
        part
        for part in (
            payload.query,
            " ".join(payload.requirements),
            f"under {payload.max_price}" if payload.max_price is not None else "",
            "current price specifications official retailer",
        )
        if part
    )
    try:
        sources = web_research_service.search_and_retrieve(
            query,
            limit=8,
            observe=lambda *_args: None,
        )
    except BrowserResearchError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {
        "query": payload.query,
        "policy": {
            "checkout_enabled": False,
            "autonomous_purchase": False,
            "reason": "Live product research returns source links; checkout remains a user-controlled handoff.",
        },
        "offers": [
            {
                "id": f"live_{index}",
                "title": source.title,
                "price": None,
                "currency": None,
                "freshness": "live",
                "source_url": source.url,
                "excerpt": source.excerpt,
            }
            for index, source in enumerate(sources, start=1)
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


@router.post("/purchase-requests")
def create_purchase_request(payload: ProductPurchaseRequest, auth: AuthContext = Depends(current_auth)) -> dict:
    job, _report, product = _selected_product(payload, auth)
    selected = any(
        decision.kind == "product_selection" and decision.selection_id == product.id
        for decision in job.automation_decisions
    )
    if not selected:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Select this product before requesting purchase")

    settings = get_settings()
    if not settings.x402_enabled or not settings.x402_commerce_endpoint:
        return {
            "status": "merchant_handoff_required",
            "product": product,
            "retailer_url": product.product_url,
            "message": "Purchase request prepared. This retailer is not connected to an x402 commerce provider, so no payment was attempted.",
        }

    step_id = store.plans[job.plan_id].steps[-1].id if job.plan_id and store.plans.get(job.plan_id) else "purchase"
    try:
        call, result = tool_gateway_service.request_quote(
            org_id=auth.org_id,
            payload=X402CallCreate(
                job_id=job.id,
                step_id=step_id,
                provider_id=settings.x402_commerce_provider_id,
                endpoint=settings.x402_commerce_endpoint,
                body={
                    "product_url": str(product.product_url),
                    "product_name": product.name,
                    "quantity": payload.quantity,
                },
                purpose=f"Purchase {payload.quantity} × {product.name}",
            ),
        )
        if call.payment_terms:
            PaymentPolicyService(settings).validate_offer(call.payment_terms, job, enforce_job_budget=False)
        store.provider_calls[call.id] = call
    except X402ProtocolError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return {
        "status": "payment_confirmation_required" if call.payment_terms else "completed",
        "product": product,
        "provider_call": call,
        "result": result,
        "message": "Review the x402 terms and confirm in your wallet." if call.payment_terms else "Commerce provider completed the request without payment.",
    }


@router.post("/selection-research")
def research_selected_product(payload: ProductSelectionResearchRequest, auth: AuthContext = Depends(current_auth)) -> dict:
    job, _report, product = _selected_product(payload, auth)
    selected = any(
        decision.kind == "product_selection" and decision.selection_id == product.id
        for decision in job.automation_decisions
    )
    if not selected:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Select this product before researching it")
    query = (
        f'"{product.name}" long term review problems owner experience Reddit warranty support '
        f'official specifications current value {product.retailer or ""}'
    )
    try:
        sources = web_research_service.search_and_retrieve(query, limit=6, observe=lambda *_args: None)
    except BrowserResearchError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    source_payload = [
        {"title": item.title, "url": item.url, "excerpt": item.excerpt[:1200], "image_url": item.image_url}
        for item in sources
    ]
    summary = ""
    verdict = "Review the community and official sources before purchasing."
    risks: list[str] = []
    specifications = list(product.specifications)
    if deepseek_client.is_configured:
        try:
            result = deepseek_client.complete_json(
                system_prompt=(
                    "Assess one selected product using only the supplied sources. Validate the supplied specifications "
                    "against official facts, then summarize owner/community reports, support, warranty, and buying risks. "
                    "Clearly separate official facts from community experience. Return JSON with summary, verdict, and "
                    "risks (up to 4 concise strings), plus specifications (up to 10 concise, source-supported strings). "
                    "Include model, processor, memory, storage, display, battery, dimensions, connectivity, or warranty "
                    "only when the supplied evidence supports them. Do not invent ratings, defects, prices, specifications, "
                    "or consensus."
                ),
                user_prompt=str({"product": product.model_dump(mode="json"), "sources": source_payload}),
                temperature=0.1,
            )
            summary = str(result.get("summary") or "").strip()
            verdict = str(result.get("verdict") or verdict).strip()
            raw_risks = result.get("risks")
            if isinstance(raw_risks, list):
                risks = [str(item).strip() for item in raw_risks if str(item).strip()][:4]
            raw_specs = result.get("specifications")
            if isinstance(raw_specs, list):
                verified = [str(item).strip() for item in raw_specs if str(item).strip()][:10]
                specifications = list(dict.fromkeys([*verified, *specifications]))[:10]
            if not specifications:
                specification_result = deepseek_client.complete_json(
                    system_prompt=(
                        "Extract only explicitly supported specifications for the selected product from the supplied "
                        "evidence. Return JSON with a specifications array of up to 10 concise strings. Prefer processor, "
                        "memory, storage, display, battery, connectivity, dimensions, and warranty. Return an empty array "
                        "when the evidence does not support a specification; never infer or invent values."
                    ),
                    user_prompt=str({"product_name": product.name, "sources": source_payload}),
                    temperature=0.0,
                )
                raw_specs = specification_result.get("specifications")
                if isinstance(raw_specs, list):
                    specifications = [str(item).strip() for item in raw_specs if str(item).strip()][:10]
        except DeepSeekError:
            pass
    response = {
        "product_id": product.id,
        "status": "ready",
        "summary": summary or f"Collected {len(sources)} additional sources for {product.name}.",
        "verdict": verdict,
        "risks": risks,
        "specifications": specifications,
        "sources": source_payload,
        "source_count": len(sources),
    }
    review = AutomationDecision(
        kind="product_review",
        selection_id=product.id,
        label=f"Due diligence for {product.name}",
        metadata=response,
    )
    job.automation_decisions = [
        item for item in job.automation_decisions if item.kind != "product_review"
    ] + [review]
    store.jobs[job.id] = job
    return response


@router.post("/checkout-reviews/{review_id}/confirm")
def confirm_checkout_review(review_id: str, payload: CheckoutReviewConfirm, auth: AuthContext = Depends(current_auth)) -> dict:
    if not payload.accept_terms:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Terms must be accepted")
    return {
        "review_id": review_id,
        "status": "handoff_required",
        "message": "Merchant checkout must be completed by the user in a trusted flow.",
    }

