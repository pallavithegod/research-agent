import json

import httpx

from app.core.config import Settings
from app.services.deepseek import DeepSeekClient


def test_deepseek_client_uses_bearer_auth_and_parses_json() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["authorization"] = request.headers["authorization"]
        captured["payload"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": "```json\n{\"summary\": \"A sufficiently detailed summary.\", "
                            "\"markdown\": \"A sufficiently detailed markdown document for validation and use.\"}\n```"
                        }
                    }
                ]
            },
        )

    settings = Settings(
        _env_file=None,
        deepseek_api_key="test-key",
        deepseek_model="deepseek-chat",
        deepseek_max_retries=0,
    )
    client = DeepSeekClient(settings, transport=httpx.MockTransport(handler))
    result = client.complete_json(system_prompt="System", user_prompt="User")

    assert captured["authorization"] == "Bearer test-key"
    assert captured["payload"]["model"] == "deepseek-chat"
    assert result["summary"] == "A sufficiently detailed summary."
