import base64
import json

import httpx
import pytest

from app.core.config import Settings
from app.domain.schemas import X402CallCreate
from app.services.tool_gateway import ToolGatewayService, X402ProtocolError


def encoded_header(payload: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")


def test_x402_quote_and_wallet_signed_settlement() -> None:
    seen_headers: list[httpx.Headers] = []

    def provider(request: httpx.Request) -> httpx.Response:
        seen_headers.append(request.headers)
        if "payment-signature" not in request.headers:
            requirements = {
                "x402Version": 2,
                "resource": {"url": "https://paid.example/products"},
                "accepts": [
                    {
                        "scheme": "exact",
                        "network": "eip155:84532",
                        "amount": "1500",
                        "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7c",
                        "payTo": "0x1111111111111111111111111111111111111111",
                        "maxTimeoutSeconds": 60,
                        "extra": {"name": "USDC", "decimals": 6},
                    }
                ],
            }
            return httpx.Response(402, headers={"Payment-Required": encoded_header(requirements)})
        receipt = encoded_header({"transaction": "0xabc123"})
        return httpx.Response(200, headers={"Payment-Response": receipt}, json={"products": []})

    settings = Settings(
        storage_backend="memory",
        x402_enabled=True,
        x402_provider_allowlist="paid.example",
        hmac_secret="a-secure-test-secret-that-is-long-enough",
    )
    service = ToolGatewayService(settings, httpx.MockTransport(provider))
    payload = X402CallCreate(
        job_id="job_1",
        step_id="step_1",
        provider_id="paid-products",
        endpoint="https://paid.example/products",
        body={"query": "laptops"},
        purpose="Current product offers",
    )

    call, result = service.request_quote(org_id="org_1", payload=payload)
    assert result is None
    assert call.status == "payment_required"
    assert call.payment_terms is not None
    assert str(call.payment_terms.amount) == "0.0015"
    assert call.payment_terms.asset == "USDC"
    assert call.payment_terms.network == "base-sepolia"

    receipt, result = service.settle(call, "wallet-created-payment-signature")
    assert seen_headers[-1]["payment-signature"] == "wallet-created-payment-signature"
    assert receipt.receipt_reference == "0xabc123"
    assert result == {"products": []}


def test_x402_rejects_non_allowlisted_provider() -> None:
    settings = Settings(
        storage_backend="memory",
        x402_enabled=True,
        x402_provider_allowlist="paid.example",
    )
    service = ToolGatewayService(settings, httpx.MockTransport(lambda _: httpx.Response(200)))
    payload = X402CallCreate(
        job_id="job_1",
        step_id="step_1",
        provider_id="untrusted",
        endpoint="https://untrusted.example/products",
        purpose="Product offers",
    )
    with pytest.raises(X402ProtocolError, match="not allow-listed"):
        service.request_quote(org_id="org_1", payload=payload)
