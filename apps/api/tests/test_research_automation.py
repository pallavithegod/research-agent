from fastapi.testclient import TestClient

from app.main import app
from app.services.research_graph import research_graph_service
from app.storage.memory import store


def reset_store() -> None:
    store.jobs.clear()
    store.plans.clear()
    store.events.clear()
    store.provider_calls.clear()
    store.receipts.clear()
    store.evidence.clear()
    store.reports.clear()


def test_clarification_constraint_and_automation_decision_are_persisted() -> None:
    reset_store()
    client = TestClient(app)

    created = client.post(
        "/v1/jobs",
        json={"query": "Find laptops", "max_spend": {"amount": "5.00"}},
    )
    assert created.status_code == 201
    payload = created.json()
    job = payload["job"]
    question = payload["clarification_questions"][0]
    assert job["status"] == "awaiting_input"

    blocked = client.post(f"/v1/jobs/{job['id']}/run")
    assert blocked.status_code == 409

    clarified = client.post(
        f"/v1/jobs/{job['id']}/clarifications",
        json={"answers": {question["id"]: "Under 1500 USD"}},
    )
    assert clarified.status_code == 200
    planning_policy = clarified.json()["plan"]["steps"][0]["policy"]
    assert planning_policy["user_constraints"][question["id"]] == "Under 1500 USD"

    completed = client.post(f"/v1/jobs/{job['id']}/run")
    assert completed.status_code == 200
    assert completed.json()["job"]["status"] == "succeeded"

    decision = client.post(
        f"/v1/jobs/{job['id']}/decisions",
        json={
            "kind": "product_selection",
            "selection_id": "thinkpad-p14s",
            "label": "ThinkPad P14s",
            "metadata": {"price": "1349 USD"},
        },
    )
    assert decision.status_code == 201

    detail = client.get(f"/v1/jobs/{job['id']}")
    assert detail.status_code == 200
    saved = detail.json()["job"]["automation_decisions"]
    assert saved[0]["selection_id"] == "thinkpad-p14s"


def test_terminal_job_cannot_be_run_twice() -> None:
    reset_store()
    client = TestClient(app)
    created = client.post(
        "/v1/jobs",
        json={
            "query": "Compare reliable research sources for a concise market briefing with citations.",
            "max_spend": {"amount": "5.00"},
        },
    )
    assert created.status_code == 201
    job_id = created.json()["job"]["id"]

    first = client.post(f"/v1/jobs/{job_id}/run")
    assert first.status_code == 200
    first_spend = first.json()["job"]["amount_spent"]["amount"]

    second = client.post(f"/v1/jobs/{job_id}/run")
    assert second.status_code == 409
    detail = client.get(f"/v1/jobs/{job_id}")
    assert detail.json()["job"]["amount_spent"]["amount"] == first_spend


class FakeDeepSeek:
    is_configured = True

    def complete_json(self, *, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict:
        if "revise" in system_prompt.lower():
            return {
                "summary": "A revised evidence-grounded summary that incorporates the user's requested emphasis.",
                "markdown": (
                    "# Revised research report\n\n"
                    "The recommendation now foregrounds reliability and clearly separates verified findings "
                    "from limitations. All conclusions remain bounded by the captured evidence and citations."
                ),
            }
        return {
            "summary": "An evidence-grounded DeepSeek summary of the completed research workflow.",
            "markdown": (
                "# Evidence-grounded research report\n\n"
                "The workflow collected and checked multiple evidence items before drafting this report. "
                "The findings are limited to the captured evidence and retain the original citation records."
            ),
        }


class UnconfiguredDeepSeek:
    is_configured = False


class HallucinatingDeepSeek(FakeDeepSeek):
    def complete_json(self, *, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict:
        if "revise" in system_prompt.lower():
            return {
                "summary": "A long enough but unsupported revision summary that must be rejected by the gate.",
                "markdown": (
                    "# Unsupported revision\n\nThis draft invents a new source and must never replace the report. "
                    "See https://invented.invalid/source for an unsupported claim that is not in evidence."
                ),
            }
        return super().complete_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
        )


class ClarifyingDeepSeek:
    is_configured = True

    def complete_json(self, *, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict:
        return {
            "prompt": "Which region should this market analysis cover?",
            "reason": "Market conditions and available sources differ by region.",
            "options": ["United States", "Europe", "Global"],
        }


def test_feedback_creates_an_immutable_deepseek_revision(monkeypatch) -> None:
    reset_store()
    monkeypatch.setattr(research_graph_service, "deepseek", FakeDeepSeek())
    client = TestClient(app)
    created = client.post(
        "/v1/jobs",
        json={
            "query": "Compare reliable research sources for a detailed market briefing with citations.",
            "max_spend": {"amount": "5.00"},
        },
    )
    job_id = created.json()["job"]["id"]
    completed = client.post(f"/v1/jobs/{job_id}/run")
    assert completed.status_code == 200
    original = completed.json()["report"]
    assert original["model_provider"] == "deepseek"
    assert completed.json()["job"]["quality_reviews"][0]["passed"] is True

    response = client.post(
        f"/v1/jobs/{job_id}/feedback",
        json={"message": "Put reliability first and make the limitations clearer.", "rating": 4, "request_revision": True},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["feedback"]["revision_status"] == "revised"
    assert body["report"]["revision"] == 2
    assert body["report"]["supersedes_report_id"] == original["id"]

    detail = client.get(f"/v1/jobs/{job_id}").json()
    assert len(detail["report_history"]) == 2
    assert store.reports[original["id"]].revision == 1


def test_revision_request_is_recorded_when_deepseek_is_not_configured(monkeypatch) -> None:
    reset_store()
    client = TestClient(app)
    created = client.post(
        "/v1/jobs",
        json={
            "query": "Compare reliable research sources for a concise market briefing with citations.",
            "max_spend": {"amount": "5.00"},
        },
    )
    job_id = created.json()["job"]["id"]
    completed = client.post(f"/v1/jobs/{job_id}/run")
    assert completed.status_code == 200
    monkeypatch.setattr(research_graph_service, "deepseek", UnconfiguredDeepSeek())

    response = client.post(
        f"/v1/jobs/{job_id}/feedback",
        json={"message": "Please make the conclusion shorter.", "request_revision": True},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["feedback"]["revision_status"] == "model_not_configured"
    assert body["report"]["revision"] == 1
    assert len(store.jobs[job_id].feedback) == 1


def test_feedback_revision_with_an_unsupported_url_is_rejected(monkeypatch) -> None:
    reset_store()
    monkeypatch.setattr(research_graph_service, "deepseek", HallucinatingDeepSeek())
    client = TestClient(app)
    created = client.post(
        "/v1/jobs",
        json={
            "query": "Compare reliable research sources for a cited market briefing with clear limitations.",
            "max_spend": {"amount": "5.00"},
        },
    )
    job_id = created.json()["job"]["id"]
    original = client.post(f"/v1/jobs/{job_id}/run").json()["report"]

    response = client.post(
        f"/v1/jobs/{job_id}/feedback",
        json={"message": "Add more sources.", "request_revision": True},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["feedback"]["revision_status"] == "failed"
    assert body["report"]["id"] == original["id"]
    assert len(client.get(f"/v1/jobs/{job_id}").json()["report_history"]) == 1


def test_deepseek_can_generate_one_focused_clarification(monkeypatch) -> None:
    reset_store()
    monkeypatch.setattr(research_graph_service, "deepseek", ClarifyingDeepSeek())
    response = TestClient(app).post(
        "/v1/jobs",
        json={"query": "Research", "max_spend": {"amount": "5.00"}},
    )
    assert response.status_code == 201
    questions = response.json()["clarification_questions"]
    assert len(questions) == 1
    assert questions[0]["prompt"] == "Which region should this market analysis cover?"


def test_research_modes_and_source_policy_change_execution() -> None:
    reset_store()
    client = TestClient(app)
    quick = client.post(
        "/v1/jobs",
        json={
            "query": "Create a concise cited briefing on reliable research methods for strategy teams.",
            "research_mode": "quick",
            "max_spend": {"amount": "5.00"},
        },
    )
    assert quick.status_code == 201
    quick_body = quick.json()
    assert quick_body["job"]["research_mode"] == "quick"
    assert len(quick_body["plan"]["steps"]) == 5
    assert quick_body["plan"]["steps"][0]["policy"]["source_policy"]["prefer_primary_sources"] is True

    blocked = client.post(
        "/v1/jobs",
        json={
            "query": "Create a detailed cited briefing on reliable research methods for strategy teams.",
            "research_mode": "deep",
            "source_policy": {"blocked_domains": ["live-source.test"], "freshness_days": 30},
            "max_spend": {"amount": "5.00"},
        },
    )
    job_id = blocked.json()["job"]["id"]
    result = client.post(f"/v1/jobs/{job_id}/run")
    assert result.status_code == 503
    assert result.json()["detail"] == "All live results were excluded by the configured source policy."
