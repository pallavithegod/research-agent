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


class ResearchJobCreate(BaseModel):
    query: str = Field(min_length=4, max_length=4000)
    locale: str = "en-US"
    deadline: datetime | None = None
    trusted_sources: list[str] = Field(default_factory=list)
    output_format: Literal["markdown", "json", "pdf"] = "markdown"
    max_spend: Money = Field(default_factory=lambda: Money(amount=Decimal("5.00")))
    require_citations: bool = True
    template: str | None = Field(default=None, description="product_research, daily_briefing, market_watch, etc.")


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
    created_at: datetime = Field(default_factory=utcnow)


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

