from enum import StrEnum


class JobStatus(StrEnum):
    DRAFT = "draft"
    AWAITING_INPUT = "awaiting_input"
    PLANNED = "planned"
    CLARIFICATION_REQUIRED = "clarification_required"
    AWAITING_BUDGET = "awaiting_budget"
    AWAITING_APPROVAL = "awaiting_approval"
    QUEUED = "queued"
    RUNNING = "running"
    PAYMENT_REQUIRED = "payment_required"
    PAID = "paid"
    PARTIAL = "partial"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    BUDGET_EXHAUSTED = "budget_exhausted"


class StepType(StrEnum):
    PLANNING = "planning"
    SEARCH = "search"
    RETRIEVAL = "retrieval"
    SUMMARIZATION = "summarization"
    FACT_CHECKING = "fact_checking"
    ENRICHMENT = "enrichment"
    ANALYSIS = "analysis"
    WRITING = "writing"
    EDITING = "editing"
    PAYMENT = "payment"
    BROWSER_OBSERVE = "browser_observe"
    BROWSER_ACT = "browser_act"
    VOICE = "voice"
    DELIVERY = "delivery"


class EventType(StrEnum):
    PLANNED = "planned"
    CLARIFICATION_REQUIRED = "clarification_required"
    WAITING_FOR_APPROVAL = "waiting_for_approval"
    PAYMENT_REQUIRED = "payment_required"
    PAID = "paid"
    RUNNING = "running"
    RETRYING = "retrying"
    PARTIAL = "partial"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    BUDGET_EXHAUSTED = "budget_exhausted"
    SCHEDULE_PAUSED = "schedule_paused"
    QUALITY_REVIEWED = "quality_reviewed"
    FEEDBACK_RECEIVED = "feedback_received"
    REPORT_REVISED = "report_revised"


class ApprovalScope(StrEnum):
    ONE_REQUEST = "one_request"
    ONE_JOB = "one_job"
    RECURRING_ALLOWANCE = "recurring_allowance"

