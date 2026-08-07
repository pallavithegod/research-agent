import os

import pytest


# Applied before test modules import the cached application settings.
os.environ["AUTH_REQUIRED"] = "false"
os.environ["STORAGE_BACKEND"] = "memory"
os.environ["DEEPSEEK_API_KEY"] = ""


class TestDeepSeek:
    is_configured = True

    def complete_json(self, *, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict:
        if "intake node" in system_prompt:
            return {
                "prompt": "What budget should I use for this comparison?",
                "reason": "A budget is required to return relevant products.",
                "options": ["Under $1,000", "Under $1,500", "Under $2,000"],
            }
        return {
            "summary": "A source-grounded research summary based entirely on retrieved live evidence.",
            "markdown": (
                "# Source-grounded answer\n\n"
                "The retrieved evidence supports this answer. Claims remain limited to the captured sources, "
                "and uncertainty is retained wherever the available evidence is incomplete."
            ),
        }


class TestBrowser:
    def search_and_retrieve(self, query: str, *, limit: int, observe):
        from app.services.browser_research import LiveSource

        observe("launch", "Launching test browser.", None, None, None, "running")
        observe(
            "extract",
            "Captured a real-provider boundary result.",
            "https://live-source.test/research",
            "Retrieved source",
            None,
            "succeeded",
        )
        return [
            LiveSource(
                title="Retrieved source",
                url="https://live-source.test/research",
                excerpt=(
                    "This is provider-boundary evidence used to test persistence, citations, quality checks, "
                    "and report generation without making a network request during the unit test."
                ),
            )
        ]

    def save_screenshot(self, job_id: str, observation_id: str, content: bytes) -> str:
        return f"/v1/jobs/{job_id}/automation/{observation_id}/screenshot"


@pytest.fixture(autouse=True)
def provider_boundaries(monkeypatch):
    from app.services.orchestrator import orchestrator_service
    from app.services.research_graph import research_graph_service

    monkeypatch.setattr(research_graph_service, "deepseek", TestDeepSeek())
    monkeypatch.setattr(orchestrator_service.research_domain, "browser", TestBrowser())
