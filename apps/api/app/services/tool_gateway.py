"""Restricted x402 client boundary for paid provider calls."""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.config import Settings, get_settings
from app.core.security import hmac_digest, sha256_digest
from app.domain.schemas import Money, PaymentReceipt, PaymentTerms, ProviderCall, X402CallCreate


class X402ProtocolError(RuntimeError):
    """Safe x402 error which does not expose provider response bodies."""


@dataclass(frozen=True)
class ProviderResponse:
    status_code: int
    headers: httpx.Headers
    content: bytes

    def data(self) -> Any:
        content_type = self.headers.get("content-type", "")
        if "json" in content_type:
            try:
                return json.loads(self.content)
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
        return {"text": self.content.decode("utf-8", errors="replace")}


class ToolGatewayService:
    """Executes an x402 quote and settlement without holding wallet keys."""

    def __init__(self, settings: Settings | None = None, transport: httpx.BaseTransport | None = None) -> None:
        self.settings = settings or get_settings()
        self._transport = transport

    def request_quote(self, *, org_id: str, payload: X402CallCreate) -> tuple[ProviderCall, Any | None]:
        self._validate_endpoint(str(payload.endpoint))
        call = self.create_provider_call(
            org_id=org_id,
            job_id=payload.job_id,
            step_id=payload.step_id,
            provider_id=payload.provider_id,
            payload={"endpoint": str(payload.endpoint), "method": payload.method, "body": payload.body},
            hmac_secret=self.settings.hmac_secret,
        )
        call.request_url = payload.endpoint
        call.request_method = payload.method
        call.request_body = payload.body

        response = self._request(call)
        if response.status_code == 402:
            call.status = "payment_required"
            call.payment_terms = self._payment_terms(response, call, payload.purpose)
            return call, None
        if 200 <= response.status_code < 300:
            call.status = "succeeded"
            return call, response.data()
        raise X402ProtocolError(f"Provider returned HTTP {response.status_code} before payment negotiation.")

    def settle(self, call: ProviderCall, payment_signature: str) -> tuple[PaymentReceipt, Any]:
        if call.status != "payment_required" or not call.payment_terms or not call.request_url:
            raise X402ProtocolError("This provider call is not waiting for x402 payment.")
        response = self._request(call, payment_signature=payment_signature)
        if not 200 <= response.status_code < 300:
            raise X402ProtocolError(f"Provider rejected the payment with HTTP {response.status_code}.")
        payment_response = response.headers.get("payment-response") or response.headers.get("x-payment-response")
        if not payment_response:
            raise X402ProtocolError("Provider succeeded without returning an x402 payment receipt.")
        receipt_payload = self._decode_protocol_value(payment_response)
        reference = self._receipt_reference(receipt_payload)
        receipt = PaymentReceipt(
            org_id=call.org_id,
            provider_call_id=call.id,
            provider_id=call.provider_id,
            amount=Money(
                amount=call.payment_terms.amount,
                asset=call.payment_terms.asset,
                network=call.payment_terms.network,
            ),
            receipt_reference=reference,
            receipt_hash=sha256_digest(payment_response),
        )
        call.status = "succeeded"
        call.receipt_id = receipt.id
        return receipt, response.data()

    def create_provider_call(
        self,
        *,
        org_id: str,
        job_id: str,
        step_id: str,
        provider_id: str,
        payload: dict,
        hmac_secret: str,
    ) -> ProviderCall:
        request_hash = hmac_digest(hmac_secret, payload)
        return ProviderCall(
            org_id=org_id,
            job_id=job_id,
            step_id=step_id,
            provider_id=provider_id,
            idempotency_key=hmac_digest(
                hmac_secret,
                {"job_id": job_id, "step_id": step_id, "provider": provider_id, "request": request_hash},
            ),
            request_hash=request_hash,
        )

    def _request(self, call: ProviderCall, payment_signature: str | None = None) -> ProviderResponse:
        headers = {"Accept": "application/json", "Idempotency-Key": call.idempotency_key}
        if payment_signature:
            header = "Payment-Signature" if (call.payment_terms and call.payment_terms.protocol_version >= 2) else "X-PAYMENT"
            headers[header] = payment_signature
        try:
            with httpx.Client(
                timeout=self.settings.x402_timeout_seconds,
                transport=self._transport,
                follow_redirects=False,
            ) as client:
                with client.stream(
                    call.request_method,
                    str(call.request_url),
                    headers=headers,
                    json=call.request_body if call.request_method == "POST" else None,
                ) as response:
                    content = bytearray()
                    for chunk in response.iter_bytes():
                        content.extend(chunk)
                        if len(content) > self.settings.x402_max_response_bytes:
                            raise X402ProtocolError("Provider response exceeded the configured size limit.")
                    return ProviderResponse(response.status_code, response.headers, bytes(content))
        except X402ProtocolError:
            raise
        except httpx.HTTPError as exc:
            raise X402ProtocolError(f"x402 provider request failed ({type(exc).__name__}).") from exc

    def _validate_endpoint(self, endpoint: str) -> None:
        if not self.settings.x402_enabled:
            raise X402ProtocolError("x402 payments are disabled. Set X402_ENABLED=true after configuring a provider.")
        parsed = urlparse(endpoint)
        if parsed.scheme != "https" or not parsed.hostname:
            raise X402ProtocolError("x402 provider endpoints must use HTTPS.")
        if parsed.username or parsed.password or parsed.port not in {None, 443}:
            raise X402ProtocolError("x402 provider endpoint credentials and custom ports are not allowed.")
        if parsed.hostname.lower() not in self.settings.allowed_x402_hosts:
            raise X402ProtocolError("x402 provider hostname is not allow-listed.")

    def _payment_terms(self, response: ProviderResponse, call: ProviderCall, purpose: str) -> PaymentTerms:
        encoded = response.headers.get("payment-required") or response.headers.get("x-payment-required")
        payload = self._decode_protocol_value(encoded) if encoded else response.data()
        if not isinstance(payload, dict):
            raise X402ProtocolError("Provider returned invalid x402 payment requirements.")
        version = int(payload.get("x402Version", payload.get("version", 1)))
        accepts = payload.get("accepts") or payload.get("paymentRequirements") or [payload]
        if not isinstance(accepts, list) or not accepts:
            raise X402ProtocolError("Provider returned no x402 payment options.")
        errors: list[str] = []
        for offer in accepts:
            if not isinstance(offer, dict):
                continue
            try:
                terms = self._normalize_offer(payload, offer, call, purpose, version)
                if terms.asset.upper() in self.settings.allowed_assets and terms.network in self.settings.allowed_networks:
                    return terms
            except (InvalidOperation, TypeError, ValueError, X402ProtocolError) as exc:
                errors.append(str(exc))
        raise X402ProtocolError("Provider returned no supported x402 payment option." + (f" {errors[0]}" if errors else ""))

    @staticmethod
    def _normalize_offer(payload: dict, offer: dict, call: ProviderCall, purpose: str, version: int) -> PaymentTerms:
        network_value = str(offer.get("network", ""))
        network = {"eip155:8453": "base", "eip155:84532": "base-sepolia"}.get(network_value, network_value)
        extra = offer.get("extra") if isinstance(offer.get("extra"), dict) else {}
        raw_asset = str(offer.get("asset", extra.get("name", "")))
        known_usdc = {
            "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
            "0x036cbd53842c5426634e7929541ec2318f3dcf7c",
        }
        asset = str(extra.get("name") or ("USDC" if raw_asset.lower() in known_usdc else raw_asset)).upper()
        raw_amount = offer.get("amount", offer.get("maxAmountRequired"))
        if raw_amount is None:
            raise X402ProtocolError("x402 amount is missing.")
        amount = Decimal(str(raw_amount))
        is_atomic_amount = "maxAmountRequired" in offer or raw_asset.lower().startswith("0x") or version >= 2
        if is_atomic_amount and amount == amount.to_integral_value():
            amount /= Decimal(10) ** int(extra.get("decimals", 6))
        if amount <= 0:
            raise X402ProtocolError("x402 amount must be positive.")
        resource_data = payload.get("resource")
        resource = resource_data.get("url") if isinstance(resource_data, dict) else resource_data
        resource = str(resource or offer.get("resource") or call.request_url)
        pay_to = str(offer.get("payTo", offer.get("pay_to", "")))
        if not network or not asset or not pay_to:
            raise X402ProtocolError("x402 network, asset, or recipient is missing.")
        timeout = max(1, min(int(offer.get("maxTimeoutSeconds", 300)), 3600))
        return PaymentTerms(
            provider_id=call.provider_id,
            service=str(offer.get("description") or payload.get("error") or call.provider_id)[:240],
            purpose=purpose,
            amount=amount,
            asset=asset,
            network=network,
            pay_to=pay_to,
            resource=resource,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=timeout),
            scheme=str(offer.get("scheme", "exact")),
            protocol_version=version,
        )

    @staticmethod
    def _decode_protocol_value(value: str | None) -> Any:
        if not value:
            raise X402ProtocolError("x402 protocol header is empty.")
        if value.lstrip().startswith("{"):
            try:
                return json.loads(value)
            except json.JSONDecodeError as exc:
                raise X402ProtocolError("x402 protocol header contains invalid JSON.") from exc
        try:
            padded = value + "=" * (-len(value) % 4)
            return json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise X402ProtocolError("x402 protocol header is not valid base64 JSON.") from exc

    @staticmethod
    def _receipt_reference(payload: Any) -> str:
        if isinstance(payload, dict):
            for key in ("transaction", "txHash", "transactionHash", "receipt", "payer"):
                if payload.get(key):
                    return str(payload[key])[:240]
        return "verified-by-provider"


tool_gateway_service = ToolGatewayService()
