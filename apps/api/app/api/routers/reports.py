from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_auth
from app.core.clerk_auth import AuthContext
from app.storage.memory import store

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{report_id}")
def get_report(report_id: str, auth: AuthContext = Depends(current_auth)) -> dict:
    report = store.reports.get(report_id)
    if not report or report.org_id != auth.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    evidence_ids = {citation.evidence_item_id for citation in report.citations}
    evidence = [item for item in store.evidence.values() if item.id in evidence_ids and item.org_id == auth.org_id]
    provider_call_ids = {item.provider_call_id for item in evidence if item.provider_call_id}
    provider_calls = [call for call in store.provider_calls.values() if call.id in provider_call_ids and call.org_id == auth.org_id]
    receipt_ids = {item.payment_receipt_id for item in evidence if item.payment_receipt_id}
    receipts = [receipt for receipt in store.receipts.values() if receipt.id in receipt_ids and receipt.org_id == auth.org_id]
    return {
        "report": report,
        "evidence": evidence,
        "provider_calls": provider_calls,
        "payment_receipts": receipts,
    }
