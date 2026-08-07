"""Small, testable client for DeepSeek's OpenAI-compatible chat API."""

from __future__ import annotations

import json
import time
from typing import Any

import httpx

from app.core.config import Settings, get_settings


class DeepSeekError(RuntimeError):
    """A safe provider error that never includes credentials or response bodies."""


class DeepSeekClient:
    def __init__(self, settings: Settings | None = None, transport: httpx.BaseTransport | None = None) -> None:
        self.settings = settings or get_settings()
        self._transport = transport

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.deepseek_api_key.strip())

    def complete_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        if not self.is_configured:
            raise DeepSeekError("DeepSeek is not configured.")

        endpoint = f"{self.settings.deepseek_base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": self.settings.deepseek_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {self.settings.deepseek_api_key}",
            "Content-Type": "application/json",
        }

        attempts = self.settings.deepseek_max_retries + 1
        for attempt in range(attempts):
            try:
                with httpx.Client(
                    timeout=self.settings.deepseek_timeout_seconds,
                    transport=self._transport,
                ) as client:
                    response = client.post(endpoint, headers=headers, json=payload)
                if response.status_code == 429 or response.status_code >= 500:
                    if attempt + 1 < attempts:
                        time.sleep(min(0.25 * (2**attempt), 1.0))
                        continue
                response.raise_for_status()
                return self._parse_json_response(response.json())
            except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                if attempt + 1 < attempts and isinstance(exc, httpx.TransportError):
                    time.sleep(min(0.25 * (2**attempt), 1.0))
                    continue
                raise DeepSeekError(f"DeepSeek request failed ({type(exc).__name__}).") from exc

        raise DeepSeekError("DeepSeek request failed after retries.")

    @staticmethod
    def _parse_json_response(payload: dict[str, Any]) -> dict[str, Any]:
        content = payload["choices"][0]["message"]["content"]
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Provider returned empty content")
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```json").removeprefix("```")
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
        parsed = json.loads(cleaned.strip())
        if not isinstance(parsed, dict):
            raise ValueError("Provider JSON must be an object")
        return parsed


deepseek_client = DeepSeekClient()
