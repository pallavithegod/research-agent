from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, HttpUrl

from app.domain.enums import ApprovalScope, EventType, JobStatus, StepType


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:18]}"


class Money(BaseModel):
    amount: Decimal = Field(ge=0)
    asset: str = "USDC"
    network: str = "base-sepolia"


class UserContext(BaseModel):
    user_id: str
    org_id: str
    roles: list[str] = Field(default_factory=list)


class SourcePolicy(BaseModel):
    prefer_primary_sources: bool = True
    freshness_days: int | None = Field(default=365, ge=1, le=3650)
    allowed_domains: list[str] = Field(default_factory=list, max_length=20)
    blocked_domains: list[str] = Field(default_factory=list, max_length=20)


class ResearchJobCreate(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    locale: str = "en-US"
    deadline: datetime | None = None
    trusted_sources: list[str] = Field(default_factory=list)
    output_format: Literal["markdown", "json", "pdf"] = "markdown"
    max_spend: Money = Field(default_factory=lambda: Money(amount=Decimal("5.00")))
    require_citations: bool = True
    template: str | None = Field(default=None, description="product_research, daily_briefing, market_watch, etc.")
    research_mode: Literal["quick", "deep", "compare"] = "deep"
    source_policy: SourcePolicy = Field(default_factory=SourcePolicy)


class ClarificationQuestion(BaseModel):
    id: str = Field(default_factory=lambda: new_id("question"))
    prompt: str
    reason: str
    options: list[str] = Field(default_factory=list)
    required: bool = True


class ClarificationResponse(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)


class AutomationDecisionCreate(BaseModel):
    kind: str = Field(min_length=2, max_length=64)
    selection_id: str = Field(min_length=1, max_length=128)
    label: str = Field(min_length=1, max_length=240)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AutomationDecision(BaseModel):
    id: str = Field(default_factory=lambda: new_id("decision"))
    kind: str
    selection_id: str
    label: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)


class ResearchFeedbackCreate(BaseModel):
    message: str = Field(min_length=2, max_length=4000)
    rating: int | None = Field(default=None, ge=1, le=5)
    request_revision: bool = False


class ResearchFeedback(BaseModel):
    id: str = Field(default_factory=lambda: new_id("feedback"))
    org_id: str
    user_id: str
    job_id: str
    message: str
    rating: int | None = None
    request_revision: bool = False
    revision_status: Literal["recorded", "revised", "model_not_configured", "failed"] = "recorded"
    revision_report_id: str | None = None
    created_at: datetime = Field(default_factory=utcnow)


class QualityReview(BaseModel):
    id: str = Field(default_factory=lambda: new_id("review"))
    passed: bool
    reviewer: Literal["evidence-gate", "deepseek+evidence-gate"] = "evidence-gate"
    issues: list[str] = Field(default_factory=list)
    score: int = Field(default=0, ge=0, le=100)
    citation_coverage: float = Field(default=0, ge=0, le=1)
    source_diversity: float = Field(default=0, ge=0, le=1)
    created_at: datetime = Field(default_factory=utcnow)


class BrowserObservation(BaseModel):
    id: str = Field(default_factory=lambda: new_id("browser"))
    action: Literal["launch", "search", "open", "extract", "complete", "error"]
    status: Literal["running", "succeeded", "failed"] = "running"
    message: str
    url: HttpUrl | None = None
    title: str | None = None
    screenshot_url: str | None = None
    created_at: datetime = Field(default_factory=utcnow)


class JobStep(BaseModel):
    id: str = Field(default_factory=lambda: new_id("step"))
    job_id: str
    type: StepType
    title: str
    provider: str | None = None
    status: JobStatus = JobStatus.PLANNED
    estimated_cost: Money = Field(default_factory=lambda: Money(amount=Decimal("0")))
    dependencies: list[str] = Field(default_factory=list)
    policy: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class JobPlan(BaseModel):
    id: str = Field(default_factory=lambda: new_id("plan"))
    job_id: str
    assumptions: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    estimated_total: Money
    steps: list[JobStep]


class ResearchJob(BaseModel):
    id: str = Field(default_factory=lambda: new_id("job"))
    org_id: str
    user_id: str
    query: str
    status: JobStatus = JobStatus.DRAFT
    locale: str = "en-US"
    output_format: str = "markdown"
    max_spend: Money
    amount_spent: Money = Field(default_factory=lambda: Money(amount=Decimal("0")))
    require_citations: bool = True
    research_mode: Literal["quick", "deep", "compare"] = "deep"
    source_policy: SourcePolicy = Field(default_factory=SourcePolicy)
    clarification_questions: list[ClarificationQuestion] = Field(default_factory=list)
    clarification_answers: dict[str, str] = Field(default_factory=dict)
    automation_decisions: list[AutomationDecision] = Field(default_factory=list)
    feedback: list[ResearchFeedback] = Field(default_factory=list)
    quality_reviews: list[QualityReview] = Field(default_factory=list)
    browser_observations: list[BrowserObservation] = Field(default_factory=list)
    plan_id: str | None = None
    report_id: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class JobEvent(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evt"))
    org_id: str
    job_id: str
    type: EventType
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)


class PaymentTerms(BaseModel):
    provider_id: str
    service: str
    purpose: str
    amount: Decimal = Field(gt=0)
    asset: str = "USDC"
    network: str = "base-sepolia"
    pay_to: str
    resource: str
    expires_at: datetime
    scheme: str = "exact"
    protocol_version: int = 2


class PaymentApprovalCreate(BaseModel):
    job_id: str
    step_id: str | None = None
    scope: ApprovalScope = ApprovalScope.ONE_REQUEST
    provider_id: str
    max_amount: Money
    purpose: str
    expires_at: datetime


class PaymentApproval(BaseModel):
    id: str = Field(default_factory=lambda: new_id("apr"))
    org_id: str
    user_id: str
    job_id: str
    step_id: str | None = None
    scope: ApprovalScope
    provider_id: str
    max_amount: Money
    purpose: str
    expires_at: datetime
    confirmed_at: datetime | None = None
    consumed_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow)


class PaymentPinCreate(BaseModel):
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")


class PaymentPinVerify(BaseModel):
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d+$")


class ProviderCall(BaseModel):
    id: str = Field(default_factory=lambda: new_id("call"))
    org_id: str
    job_id: str
    step_id: str
    provider_id: str
    status: Literal["created", "payment_required", "paid", "succeeded", "failed"] = "created"
    idempotency_key: str
    request_hash: str
    payment_terms: PaymentTerms | None = None
    receipt_id: str | None = None
    request_url: HttpUrl | None = None
    request_method: Literal["GET", "POST"] = "POST"
    request_body: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)


class PaymentReceipt(BaseModel):
    id: str = Field(default_factory=lambda: new_id("rcpt"))
    org_id: str
    provider_call_id: str
    provider_id: str
    amount: Money
    receipt_reference: str
    receipt_hash: str
    created_at: datetime = Field(default_factory=utcnow)


class EvidenceItem(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evd"))
    org_id: str
    job_id: str
    step_id: str
    source_url: HttpUrl | None = None
    source_type: str = "web"
    title: str
    excerpt: str
    image_url: HttpUrl | None = None
    retrieved_at: datetime = Field(default_factory=utcnow)
    provider_call_id: str | None = None
    payment_receipt_id: str | None = None


class Citation(BaseModel):
    id: str = Field(default_factory=lambda: new_id("cit"))
    evidence_item_id: str
    claim: str
    confidence: float = Field(ge=0, le=1)


class Report(BaseModel):
    id: str = Field(default_factory=lambda: new_id("rpt"))
    org_id: str
    job_id: str
    title: str
    summary: str
    markdown: str
    citations: list[Citation] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    revision: int = Field(default=1, ge=1)
    supersedes_report_id: str | None = None
    model_provider: str | None = None
    suggested_follow_ups: list[str] = Field(default_factory=list, max_length=5)
    products: list["ProductOption"] = Field(default_factory=list, max_length=12)
    created_at: datetime = Field(default_factory=utcnow)


class ProductOption(BaseModel):
    id: str = Field(default_factory=lambda: new_id("product"))
    name: str = Field(min_length=2, max_length=240)
    description: str = Field(min_length=10, max_length=1000)
    price: str | None = Field(default=None, max_length=80)
    specifications: list[str] = Field(default_factory=list, max_length=8)
    best_for: str | None = Field(default=None, max_length=240)
    retailer: str | None = Field(default=None, max_length=120)
    product_url: HttpUrl
    image_url: HttpUrl | None = None
    evidence_id: str


class X402CallCreate(BaseModel):
    job_id: str
    step_id: str
    provider_id: str = Field(min_length=2, max_length=80, pattern=r"^[a-zA-Z0-9._-]+$")
    endpoint: HttpUrl
    method: Literal["GET", "POST"] = "POST"
    body: dict[str, Any] = Field(default_factory=dict)
    purpose: str = Field(min_length=3, max_length=240)


class X402PaymentSubmit(BaseModel):
    approval_id: str
    payment_signature: str = Field(min_length=16, max_length=16000)


class ScheduleCreate(BaseModel):
    name: str
    query: str
    timezone: str
    rrule: str
    max_per_run: Money
    max_per_period: Money
    delivery_targets: list[str] = Field(default_factory=list)


class Schedule(BaseModel):
    id: str = Field(default_factory=lambda: new_id("sch"))
    org_id: str
    user_id: str
    name: str
    query: str
    timezone: str
    rrule: str
    enabled: bool = True
    max_per_run: Money
    max_per_period: Money
    delivery_targets: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utcnow)


class ProductSearchCreate(BaseModel):
    query: str
    locale: str = "en-US"
    max_price: Decimal | None = None
    requirements: list[str] = Field(default_factory=list)


class CheckoutIntentCreate(BaseModel):
    product_url: HttpUrl
    sku: str
    retailer: str
    quantity: int = Field(default=1, ge=1)
    shipping_address_ref: str
    payment_method_ref: str | None = None


class CheckoutReviewConfirm(BaseModel):
    payment_pin: str = Field(min_length=4, max_length=6)
    accept_terms: bool


class ProductPurchaseRequest(BaseModel):
    job_id: str
    product_id: str
    quantity: int = Field(default=1, ge=1, le=10)


class ProductSelectionResearchRequest(BaseModel):
    job_id: str
    product_id: str

