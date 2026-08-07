"""LangGraph workflows for intake, execution quality, and report feedback."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from typing import Literal, TypedDict

from langgraph.graph import END, START, StateGraph

from app.domain.schemas import (
    ClarificationQuestion,
    EvidenceItem,
    ProductOption,
    QualityReview,
    Report,
    ResearchFeedback,
    ResearchJob,
)
from app.services.deepseek import DeepSeekClient, DeepSeekError, deepseek_client


class IntakeState(TypedDict, total=False):
    query: str
    template: str
    question: ClarificationQuestion | None
    route: Literal["clarify", "plan"]


class ExecutionState(TypedDict, total=False):
    job: ResearchJob
    executor: Callable[[ResearchJob], Report]
    evidence_loader: Callable[[ResearchJob], list[EvidenceItem]]
    report: Report
    fallback_report: Report
    route: Literal["execute", "reject", "enhance", "review"]
    validation_error: str
    enhancement_error: str
    quality_review: QualityReview


class FeedbackState(TypedDict, total=False):
    job: ResearchJob
    report: Report
    feedback: ResearchFeedback
    evidence: list[EvidenceItem]
    route: Literal["record", "unavailable", "revise", "validate", "failed"]
    revision_status: Literal["recorded", "revised", "model_not_configured", "failed"]
    revised_summary: str
    revised_markdown: str
    error: str


class ResearchGraphService:
    """Owns the compiled graphs and all model boundaries.

    Stable routing and evidence checks stay deterministic. DeepSeek is used only
    for grounded writing and revision nodes, never for authorization, payments,
    or deciding whether a quality check passed.
    """

    def __init__(self, deepseek: DeepSeekClient | None = None) -> None:
        self.deepseek = deepseek or deepseek_client
        self._intake_graph = self._build_intake_graph()
        self._execution_graph = self._build_execution_graph()
        self._feedback_graph = self._build_feedback_graph()

    def assess(self, job: ResearchJob) -> list[ClarificationQuestion]:
        result = self._intake_graph.invoke(
            {"query": job.query, "template": "product" if self._is_product_query(job.query) else "research"}
        )
        question = result.get("question")
        return [question] if question else []

    def execute(
        self,
        job: ResearchJob,
        executor: Callable[[ResearchJob], Report],
        evidence_loader: Callable[[ResearchJob], list[EvidenceItem]],
    ) -> tuple[Report, QualityReview]:
        result = self._execution_graph.invoke(
            {"job": job, "executor": executor, "evidence_loader": evidence_loader}
        )
        return result["report"], result["quality_review"]

    def apply_feedback(
        self,
        job: ResearchJob,
        report: Report,
        feedback: ResearchFeedback,
        evidence: list[EvidenceItem],
    ) -> FeedbackState:
        return self._feedback_graph.invoke(
            {"job": job, "report": report, "feedback": feedback, "evidence": evidence}
        )

    def _build_intake_graph(self):
        graph = StateGraph(IntakeState)
        graph.add_node("inspect_request", self._inspect_request)
        graph.add_node("request_clarification", self._request_clarification)
        graph.add_node("ready_to_plan", self._ready_to_plan)
        graph.add_edge(START, "inspect_request")
        graph.add_conditional_edges(
            "inspect_request",
            lambda state: state["route"],
            {"clarify": "request_clarification", "plan": "ready_to_plan"},
        )
        graph.add_edge("request_clarification", END)
        graph.add_edge("ready_to_plan", END)
        return graph.compile()

    def _build_execution_graph(self):
        graph = StateGraph(ExecutionState)
        graph.add_node("validate_job", self._validate_job)
        graph.add_node("reject_job", self._reject_job)
        graph.add_node("execute_research", self._execute_research)
        graph.add_node("enhance_with_deepseek", self._enhance_with_deepseek)
        graph.add_node("quality_gate", self._quality_gate)
        graph.add_edge(START, "validate_job")
        graph.add_conditional_edges(
            "validate_job",
            lambda state: state["route"],
            {"execute": "execute_research", "reject": "reject_job"},
        )
        graph.add_conditional_edges(
            "execute_research",
            lambda state: state["route"],
            {"enhance": "enhance_with_deepseek", "review": "quality_gate"},
        )
        graph.add_edge("enhance_with_deepseek", "quality_gate")
        graph.add_edge("quality_gate", END)
        graph.add_edge("reject_job", END)
        return graph.compile()

    def _build_feedback_graph(self):
        graph = StateGraph(FeedbackState)
        graph.add_node("inspect_feedback", self._inspect_feedback)
        graph.add_node("record_feedback", self._record_feedback)
        graph.add_node("model_unavailable", self._model_unavailable)
        graph.add_node("revise_report", self._revise_report)
        graph.add_node("validate_revision", self._validate_revision)
        graph.add_edge(START, "inspect_feedback")
        graph.add_conditional_edges(
            "inspect_feedback",
            lambda state: state["route"],
            {
                "record": "record_feedback",
                "unavailable": "model_unavailable",
                "revise": "revise_report",
            },
        )
        graph.add_conditional_edges(
            "revise_report",
            lambda state: state["route"],
            {"validate": "validate_revision", "failed": END},
        )
        graph.add_edge("record_feedback", END)
        graph.add_edge("model_unavailable", END)
        graph.add_edge("validate_revision", END)
        return graph.compile()

    @staticmethod
    def _inspect_request(state: IntakeState) -> IntakeState:
        query = state["query"].strip()
        vague_phrases = {"help", "research", "compare", "find", "tell me", "show me"}
        if query.lower().strip(" ?!.") in vague_phrases or len(query.split()) < 2:
            return {"route": "clarify"}
        if ResearchGraphService._is_product_query(query) and not any(
            token in query.lower() for token in ("$", "budget", "under ", "below ", "max ")
        ):
            return {"route": "clarify"}
        return {"route": "plan"}

    def _request_clarification(self, state: IntakeState) -> IntakeState:
        if self.deepseek.is_configured:
            try:
                result = self.deepseek.complete_json(
                    system_prompt=(
                        "You are the intake node for a research workflow. Ask exactly one high-value clarification "
                        "that is necessary to produce a useful answer. Do not ask for information already present. "
                        "Return JSON with prompt, reason, and options (an array of two or three short strings)."
                    ),
                    user_prompt=json.dumps(
                        {"query": state["query"], "request_type": state["template"]},
                        ensure_ascii=False,
                    ),
                    temperature=0.1,
                )
                prompt = result.get("prompt")
                reason = result.get("reason")
                options = result.get("options")
                if (
                    isinstance(prompt, str)
                    and len(prompt.strip()) >= 8
                    and isinstance(reason, str)
                    and len(reason.strip()) >= 8
                    and isinstance(options, list)
                    and 2 <= len(options) <= 3
                    and all(isinstance(option, str) and option.strip() for option in options)
                ):
                    return {
                        "question": ClarificationQuestion(
                            prompt=prompt.strip(),
                            reason=reason.strip(),
                            options=[option.strip() for option in options],
                        )
                    }
            except (DeepSeekError, ValueError):
                pass

        return {"question": self._fallback_question(state["query"])}

    @staticmethod
    def _fallback_question(query: str) -> ClarificationQuestion:
        if ResearchGraphService._is_product_query(query):
            return ClarificationQuestion(
                prompt="What budget should I use for this comparison?",
                reason="A maximum price lets the research rank compatible options instead of returning an unfocused list.",
                options=["Under $1,000", "Under $1,500", "Under $2,000"],
            )
        return ClarificationQuestion(
            prompt="What should the final answer optimize for?",
            reason="A focused outcome helps the planner choose the right sources and comparison criteria.",
            options=["A concise recommendation", "A detailed comparison", "A cited briefing"],
        )

    @staticmethod
    def _ready_to_plan(state: IntakeState) -> IntakeState:
        return {"question": None}

    def _validate_job(self, state: ExecutionState) -> ExecutionState:
        job = state["job"]
        if not job.plan_id:
            return {"route": "reject", "validation_error": "Cannot execute a job without a plan."}
        if not self.deepseek.is_configured:
            return {
                "route": "reject",
                "validation_error": "DeepSeek is not configured. Add DEEPSEEK_API_KEY before running live research.",
            }
        return {"route": "execute"}

    @staticmethod
    def _reject_job(state: ExecutionState) -> ExecutionState:
        raise ValueError(state.get("validation_error", "Research job failed validation."))

    def _execute_research(self, state: ExecutionState) -> ExecutionState:
        report = state["executor"](state["job"])
        return {
            "report": report,
            "fallback_report": report.model_copy(deep=True),
            "route": "enhance" if self.deepseek.is_configured else "review",
        }

    def _enhance_with_deepseek(self, state: ExecutionState) -> ExecutionState:
        job = state["job"]
        report = state["report"]
        evidence = state["evidence_loader"](job)
        try:
            result = self.deepseek.complete_json(
                system_prompt=(
                    "You are the report-writing node in a live research graph. Answer the user's actual question "
                    "using only supplied evidence. Never invent facts, products, prices, sources, URLs, or citations. "
                    "Write polished GitHub-Flavored Markdown with clear headings, concise paragraphs, lists where useful, "
                    "and a valid Markdown table whenever comparing products or multiple options. The main markdown must "
                    "contain no hyperlinks, raw URLs, citations section, or source list; the UI presents all evidence "
                    "links separately in its Sources panel. For product requests, focus the answer on concrete products, "
                    "their current evidenced details, differences, and recommendation. Never turn a search-engine result "
                    "page, category page, article, or buying guide into a product. "
                    "State uncertainty and omit unsupported claims. Also generate 3 contextual next prompts; these must "
                    "be useful actions based on the answer, never canned text. For product requests, return structured "
                    "products for every genuine product supported by the evidence, including evidence_id, name, description, price, "
                    "specifications, best_for, retailer, product_url, and image_url. Use null when a price or image is "
                    "not evidenced. Return JSON with summary, markdown, suggested_follow_ups, and products."
                ),
                user_prompt=self._report_prompt(job, report, evidence),
            )
            summary, markdown = self._validated_model_document(result)
            report.summary = summary
            report.markdown = markdown
            report.suggested_follow_ups = self._validated_follow_ups(result)
            products = self._validated_products(result, evidence)
            if self._is_product_query(job.query) and not products:
                try:
                    product_result = self.deepseek.complete_json(
                        system_prompt=(
                            "Extract genuine purchasable products from the supplied live evidence. Return JSON with one "
                            "products array and no prose. Include every supported product using evidence_id, name, "
                            "description, price, specifications, best_for, retailer, product_url, and image_url. The "
                            "product_url must exactly equal that evidence item's source_url. Omit search results, category "
                            "pages, articles, lists, and buying guides. Never infer unsupported details or invent a product."
                        ),
                        user_prompt=json.dumps(
                            {"query": job.query, "evidence": self._evidence_payload(evidence)},
                            ensure_ascii=False,
                        ),
                    )
                    products = self._validated_products(product_result, evidence)
                except (DeepSeekError, ValueError):
                    products = []
            report.products = products
            if self._is_product_query(job.query) and products:
                report.markdown = self._product_markdown(summary, products)
            report.model_provider = "deepseek"
            return {"report": report}
        except DeepSeekError as exc:
            return {"report": report, "enhancement_error": str(exc)}
        except ValueError as exc:
            return {"report": report, "enhancement_error": f"DeepSeek output rejected: {exc}"}

    @staticmethod
    def _quality_gate(state: ExecutionState) -> ExecutionState:
        job = state["job"]
        report = state["report"]
        evidence = state["evidence_loader"](job)
        issues = ResearchGraphService._grounding_issues(report, evidence, job.require_citations)
        if issues and report.model_provider == "deepseek":
            report = state["fallback_report"]
            report.limitations = list(dict.fromkeys(report.limitations + [
                "A DeepSeek draft failed the evidence gate, so the grounded deterministic report was retained."
            ]))
            issues = ResearchGraphService._grounding_issues(report, evidence, job.require_citations)
        if state.get("enhancement_error"):
            report.limitations = list(dict.fromkeys(report.limitations + [
                "DeepSeek enhancement was unavailable or rejected; the deterministic evidence report was retained."
            ]))
        citation_coverage, source_diversity, score = ResearchGraphService._quality_metrics(
            report, evidence, issues
        )
        review = QualityReview(
            passed=not issues,
            reviewer="deepseek+evidence-gate" if report.model_provider == "deepseek" else "evidence-gate",
            issues=issues,
            score=score,
            citation_coverage=citation_coverage,
            source_diversity=source_diversity,
        )
        return {"report": report, "quality_review": review}

    def _inspect_feedback(self, state: FeedbackState) -> FeedbackState:
        if not state["feedback"].request_revision:
            return {"route": "record"}
        if not self.deepseek.is_configured:
            return {"route": "unavailable"}
        return {"route": "revise"}

    @staticmethod
    def _record_feedback(state: FeedbackState) -> FeedbackState:
        return {"revision_status": "recorded"}

    @staticmethod
    def _model_unavailable(state: FeedbackState) -> FeedbackState:
        return {
            "revision_status": "model_not_configured",
            "error": "Set DEEPSEEK_API_KEY to enable report revisions.",
        }

    def _revise_report(self, state: FeedbackState) -> FeedbackState:
        try:
            result = self.deepseek.complete_json(
                system_prompt=(
                    "You revise cited research reports from user feedback. Use only the supplied report and evidence. "
                    "Never add a source, URL, product claim, price, or citation not present in the evidence. "
                    "Keep hyperlinks, raw URLs, the source list, and citation links out of the main markdown because "
                    "the UI displays them separately in its Sources panel. "
                    "Return JSON with exactly two string fields: summary and markdown."
                ),
                user_prompt=self._feedback_prompt(state),
            )
            summary, markdown = self._validated_model_document(result)
            return {
                "revised_summary": summary,
                "revised_markdown": markdown,
                "route": "validate",
            }
        except (DeepSeekError, ValueError) as exc:
            return {"route": "failed", "revision_status": "failed", "error": str(exc)}

    @staticmethod
    def _validate_revision(state: FeedbackState) -> FeedbackState:
        candidate = state["report"].model_copy(
            update={"summary": state["revised_summary"], "markdown": state["revised_markdown"]}
        )
        issues = ResearchGraphService._grounding_issues(
            candidate,
            state["evidence"],
            state["job"].require_citations,
        )
        if issues:
            return {
                "revision_status": "failed",
                "error": "Revision failed the evidence gate: " + "; ".join(issues),
            }
        return {"revision_status": "revised"}

    @staticmethod
    def _report_prompt(job: ResearchJob, report: Report, evidence: list[EvidenceItem]) -> str:
        payload = {
            "query": job.query,
            "research_mode": job.research_mode,
            "source_policy": job.source_policy.model_dump(),
            "confirmed_constraints": job.clarification_answers,
            "current_summary": report.summary,
            "current_markdown": report.markdown[:12000],
            "evidence": ResearchGraphService._evidence_payload(evidence),
        }
        return json.dumps(payload, ensure_ascii=False, default=str)

    @staticmethod
    def _feedback_prompt(state: FeedbackState) -> str:
        payload = {
            "query": state["job"].query,
            "feedback": state["feedback"].message,
            "rating": state["feedback"].rating,
            "current_summary": state["report"].summary,
            "current_markdown": state["report"].markdown[:12000],
            "evidence": ResearchGraphService._evidence_payload(state["evidence"]),
        }
        return json.dumps(payload, ensure_ascii=False, default=str)

    @staticmethod
    def _evidence_payload(evidence: list[EvidenceItem]) -> list[dict]:
        return [
            {
                "id": item.id,
                "title": item.title[:300],
                "excerpt": item.excerpt[:1200],
                "source_url": str(item.source_url) if item.source_url else None,
                "image_url": str(item.image_url) if item.image_url else None,
                "retrieved_at": item.retrieved_at.isoformat(),
            }
            for item in evidence[:20]
        ]

    @staticmethod
    def _validated_model_document(result: dict) -> tuple[str, str]:
        summary = result.get("summary")
        markdown = result.get("markdown")
        if not isinstance(summary, str) or len(summary.strip()) < 20:
            raise ValueError("summary is missing or too short")
        if not isinstance(markdown, str) or len(markdown.strip()) < 80:
            raise ValueError("markdown is missing or too short")
        return summary.strip(), markdown.strip()

    @staticmethod
    def _validated_follow_ups(result: dict) -> list[str]:
        items = result.get("suggested_follow_ups")
        if not isinstance(items, list):
            return []
        return [item.strip() for item in items if isinstance(item, str) and 8 <= len(item.strip()) <= 240][:5]

    @staticmethod
    def _validated_products(result: dict, evidence: list[EvidenceItem]) -> list[ProductOption]:
        items = result.get("products")
        if not isinstance(items, list):
            return []
        by_id = {item.id: item for item in evidence}
        products: list[ProductOption] = []
        for raw in items[:12]:
            if not isinstance(raw, dict):
                continue
            evidence_item = by_id.get(str(raw.get("evidence_id") or ""))
            if not evidence_item or not evidence_item.source_url:
                continue
            product_url = str(raw.get("product_url") or "").rstrip("/")
            if product_url != str(evidence_item.source_url).rstrip("/"):
                continue
            allowed_image = str(evidence_item.image_url) if evidence_item.image_url else None
            requested_image = str(raw.get("image_url")) if raw.get("image_url") else None
            if requested_image != allowed_image:
                requested_image = allowed_image
            try:
                products.append(ProductOption(
                    name=str(raw.get("name") or "").strip(),
                    description=str(raw.get("description") or "").strip(),
                    price=str(raw["price"]).strip() if raw.get("price") else None,
                    specifications=[str(value).strip() for value in raw.get("specifications", []) if str(value).strip()][:8],
                    best_for=str(raw["best_for"]).strip() if raw.get("best_for") else None,
                    retailer=str(raw["retailer"]).strip() if raw.get("retailer") else None,
                    product_url=product_url,
                    image_url=requested_image,
                    evidence_id=evidence_item.id,
                ))
            except (ValueError, TypeError):
                continue
        return products

    @staticmethod
    def _product_markdown(summary: str, products: list[ProductOption]) -> str:
        sections = ["# Product recommendations", summary]
        for product in products:
            details = [product.description]
            if product.price:
                details.append(f"**Current price:** {product.price}")
            if product.specifications:
                details.append("**Key specifications:** " + "; ".join(product.specifications))
            if product.best_for:
                details.append(f"**Best for:** {product.best_for}")
            if product.retailer:
                details.append(f"**Retailer:** {product.retailer}")
            sections.append(f"## {product.name}\n\n" + "\n\n".join(details))
        return "\n\n".join(sections)

    @staticmethod
    def _grounding_issues(report: Report, evidence: list[EvidenceItem], require_citations: bool) -> list[str]:
        issues: list[str] = []
        evidence_ids = {item.id for item in evidence}
        citation_ids = {citation.evidence_item_id for citation in report.citations}
        missing_ids = citation_ids - evidence_ids
        if require_citations and not report.citations:
            issues.append("The report has no citations.")
        if missing_ids:
            issues.append("Citations reference missing evidence: " + ", ".join(sorted(missing_ids)))

        allowed_urls = {str(item.source_url).rstrip("/") for item in evidence if item.source_url}
        document_urls = {
            match.rstrip("/).,]")
            for match in re.findall(r"https?://[^\s<>]+", report.markdown)
        }
        unsupported_urls = document_urls - allowed_urls
        if unsupported_urls:
            issues.append("The report contains URLs not present in evidence.")
        return issues

    @staticmethod
    def _quality_metrics(
        report: Report,
        evidence: list[EvidenceItem],
        issues: list[str],
    ) -> tuple[float, float, int]:
        evidence_count = len(evidence)
        valid_citation_ids = {
            citation.evidence_item_id
            for citation in report.citations
            if any(item.id == citation.evidence_item_id for item in evidence)
        }
        citation_coverage = min(len(valid_citation_ids) / max(evidence_count, 1), 1.0)
        source_families = {
            (item.source_type, str(item.source_url).split("/")[2] if item.source_url else "internal")
            for item in evidence
        }
        source_diversity = min(len(source_families) / max(min(evidence_count, 4), 1), 1.0)
        score = round((citation_coverage * 55) + (source_diversity * 25) + (20 if not issues else 0))
        return round(citation_coverage, 3), round(source_diversity, 3), max(0, min(score, 100))

    @staticmethod
    def _is_product_query(query: str) -> bool:
        return any(
            term in query.lower()
            for term in (
                "laptop", "notebook", "computer", "phone", "smartphone", "mobile", "tablet", "product",
                "headphone", "earbud", "speaker", "monitor", "television", " tv", "camera", "smartwatch",
                "watch", "keyboard", "mouse", "printer", "router", "console", "shoe", "sneaker", "appliance",
                "refrigerator", "washing machine", "air conditioner", "buy ", "price", "shopping",
            )
        )


research_graph_service = ResearchGraphService()
