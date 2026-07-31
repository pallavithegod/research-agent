from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.security import hmac_digest
from app.domain.schemas import PaymentTerms, ProviderCall


class ToolGatewayService:
    """Controlled external-provider boundary.

    Agents should call this service, not arbitrary URLs. Real x402 SDK calls can be inserted here.
    """

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
            idempotency_key=hmac_digest(hmac_secret, {"job_id": job_id, "step_id": step_id, "provider": provider_id}),
            request_hash=request_hash,
        )

    def mock_payment_terms(self, call: ProviderCall, purpose: str) -> PaymentTerms:
        return PaymentTerms(
            provider_id=call.provider_id,
            service=call.provider_id,
            purpose=purpose,
            amount=Decimal("0.42"),
            asset="USDC",
            network="base-sepolia",
            pay_to="0x0000000000000000000000000000000000000000",
            resource=f"provider-call:{call.id}",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )


tool_gateway_service = ToolGatewayService()

