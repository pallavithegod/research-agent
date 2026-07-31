from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status

from app.core.config import Settings
from app.domain.schemas import Money, PaymentApproval, PaymentTerms, ResearchJob


class PaymentPolicyService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def validate_terms(self, terms: PaymentTerms, job: ResearchJob, approvals: list[PaymentApproval]) -> None:
        if terms.asset.upper() not in self.settings.allowed_assets:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment asset is not supported")
        if terms.network not in self.settings.allowed_networks:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment network is not supported")
        if terms.expires_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment terms are expired")
        if job.amount_spent.amount + terms.amount > job.max_spend.amount:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Job budget would be exceeded")

        matching = [
            approval
            for approval in approvals
            if approval.job_id == job.id
            and approval.provider_id == terms.provider_id
            and approval.confirmed_at is not None
            and approval.expires_at > datetime.now(timezone.utc)
            and approval.max_amount.amount >= terms.amount
        ]
        if not matching:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "reason": "payment_approval_required",
                    "provider_id": terms.provider_id,
                    "amount": str(terms.amount),
                    "asset": terms.asset,
                    "network": terms.network,
                    "purpose": terms.purpose,
                },
            )

    @staticmethod
    def money(amount: Decimal, template: Money) -> Money:
        return Money(amount=amount, asset=template.asset, network=template.network)

