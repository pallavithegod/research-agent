from decimal import Decimal

from app.domain.enums import StepType
from app.domain.schemas import JobPlan, JobStep, Money, ResearchJob
from app.services.research_graph import research_graph_service


class PlannerService:
    """Deterministic plan construction behind a LangGraph-powered intake gate."""

    def clarification_questions(self, job: ResearchJob):
        return research_graph_service.assess(job)

    def create_plan(self, job: ResearchJob) -> JobPlan:
        deep_steps = [
            (StepType.PLANNING, "Clarify constraints and success criteria", Decimal("0.00"), None),
            (StepType.SEARCH, "Search across independent live-web providers", Decimal("0.00"), "multi-source-search"),
            (StepType.RETRIEVAL, "Open and extract readable source pages", Decimal("0.00"), "web-parser"),
            (StepType.SUMMARIZATION, "Synthesize retrieved content with DeepSeek", Decimal("0.00"), "deepseek"),
            (StepType.FACT_CHECKING, "Check claims against independent live sources", Decimal("0.00"), "evidence-gate"),
            (StepType.ENRICHMENT, "Extract current product and entity details", Decimal("0.00"), "web-parser"),
            (StepType.ANALYSIS, "Compare options and identify trade-offs", Decimal("0.00"), "deepseek"),
            (StepType.WRITING, "Draft a cited Markdown report", Decimal("0.00"), "deepseek"),
            (StepType.EDITING, "Reject unsupported URLs and citations", Decimal("0.00"), "evidence-gate"),
        ]
        if job.research_mode == "quick":
            included = {StepType.PLANNING, StepType.SEARCH, StepType.RETRIEVAL, StepType.WRITING, StepType.EDITING}
            step_specs = [spec for spec in deep_steps if spec[0] in included]
        elif job.research_mode == "compare":
            step_specs = [
                spec
                for spec in deep_steps
                if spec[0] not in {StepType.SUMMARIZATION}
            ]
        else:
            step_specs = deep_steps
        steps: list[JobStep] = []
        dependencies: list[str] = []
        total = Decimal("0")
        for step_type, title, cost, provider in step_specs:
            policy = {
                "require_citations": job.require_citations,
                "no_silent_payment": True,
                "provider_allow_list_required": provider is not None,
                "research_mode": job.research_mode,
                "source_policy": job.source_policy.model_dump(),
            }
            if step_type == StepType.PLANNING and job.clarification_answers:
                policy["user_constraints"] = job.clarification_answers
            step = JobStep(
                job_id=job.id,
                type=step_type,
                title=title,
                provider=provider,
                estimated_cost=Money(amount=cost, asset=job.max_spend.asset, network=job.max_spend.network),
                dependencies=dependencies[-1:] if dependencies else [],
                policy=policy,
            )
            steps.append(step)
            dependencies.append(step.id)
            total += cost

        assumptions = [
            "Every major claim must map to evidence and a retrieval timestamp.",
            "Checkout and protected-site actions are disabled until a separate approval-gated phase.",
            f"The workflow is using {job.research_mode} research mode.",
        ]
        if job.clarification_answers:
            assumptions.append("The plan incorporates the user-confirmed intake constraints.")
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

