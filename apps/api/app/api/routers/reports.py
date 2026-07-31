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
    return {"report": report, "evidence": evidence}

