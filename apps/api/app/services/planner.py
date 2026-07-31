from decimal import Decimal

from app.domain.enums import StepType
from app.domain.schemas import JobPlan, JobStep, Money, ResearchJob


class PlannerService:
    """Deterministic MVP planner. Replace internals with LangGraph or another orchestrator later."""

    def create_plan(self, job: ResearchJob) -> JobPlan:
        step_specs = [
            (StepType.PLANNING, "Clarify constraints and success criteria", Decimal("0.00"), None),
            (StepType.SEARCH, "Find web, news, academic, or product sources", Decimal("0.24"), "paid-search-api"),
            (StepType.RETRIEVAL, "Retrieve source excerpts with timestamps", Decimal("0.18"), "retrieval-api"),
            (StepType.SUMMARIZATION, "Summarize retrieved source content only", Decimal("0.30"), "summary-api"),
            (StepType.FACT_CHECKING, "Verify important claims independently", Decimal("1.20"), "claim-verification-api"),
            (StepType.ENRICHMENT, "Fetch structured product/entity/domain data", Decimal("0.45"), "entity-enrichment-api"),
            (StepType.ANALYSIS, "Compare options and identify trade-offs", Decimal("0.20"), "analysis-model"),
            (StepType.WRITING, "Draft cited report", Decimal("0.35"), "report-generator"),
            (StepType.EDITING, "Check citation coverage and unsupported claims", Decimal("0.25"), "editor-agent"),
        ]
        steps: list[JobStep] = []
        dependencies: list[str] = []
        total = Decimal("0")
        for step_type, title, cost, provider in step_specs:
            step = JobStep(
                job_id=job.id,
                type=step_type,
                title=title,
                provider=provider,
                estimated_cost=Money(amount=cost, asset=job.max_spend.asset, network=job.max_spend.network),
                dependencies=dependencies[-1:] if dependencies else [],
                policy={
                    "require_citations": job.require_citations,
                    "no_silent_payment": True,
                    "provider_allow_list_required": provider is not None,
                },
            )
            steps.append(step)
            dependencies.append(step.id)
            total += cost

        assumptions = [
            "Paid provider calls must be explicitly approved or fit a scoped allowance.",
            "Every major claim must map to evidence and a retrieval timestamp.",
            "Checkout and protected-site actions are disabled until a separate approval-gated phase.",
        ]
        missing_information = []
        if len(job.query.split()) < 8:
            missing_information.append("The query may need more constraints such as region, date range, or output style.")

        return JobPlan(
            job_id=job.id,
            assumptions=assumptions,
            missing_information=missing_information,
            estimated_total=Money(amount=total, asset=job.max_spend.asset, network=job.max_spend.network),
            steps=steps,
        )


planner_service = PlannerService()

