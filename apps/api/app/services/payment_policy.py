from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status

from app.core.config import Settings
from app.domain.enums import ApprovalScope
from app.domain.schemas import Money, PaymentApproval, PaymentTerms, ResearchJob


class PaymentPolicyService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def validate_terms(self, terms: PaymentTerms, job: ResearchJob, approvals: list[PaymentApproval]) -> None:
        self.validate_offer(terms, job, enforce_job_budget=not terms.purpose.startswith("Purchase "))
        now = datetime.now(timezone.utc)
        matching = [
            approval
            for approval in approvals
            if approval.job_id == job.id
            and approval.provider_id == terms.provider_id
            and approval.confirmed_at is not None
            and not (approval.scope == ApprovalScope.ONE_REQUEST and approval.consumed_at is not None)
            and approval.expires_at > now
            and approval.max_amount.amount >= terms.amount
            and approval.max_amount.asset.upper() == terms.asset.upper()
            and approval.max_amount.network == terms.network
            and approval.purpose == terms.purpose
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

    def validate_offer(self, terms: PaymentTerms, job: ResearchJob, *, enforce_job_budget: bool = True) -> None:
        if terms.asset.upper() not in self.settings.allowed_assets:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment asset is not supported")
        if terms.network not in self.settings.allowed_networks:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment network is not supported")
        if terms.expires_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment terms are expired")
        if enforce_job_budget and job.amount_spent.amount + terms.amount > job.max_spend.amount:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Job budget would be exceeded")

    @staticmethod
    def money(amount: Decimal, template: Money) -> Money:
        return Money(amount=amount, asset=template.asset, network=template.network)

