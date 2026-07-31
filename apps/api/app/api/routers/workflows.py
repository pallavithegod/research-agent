from fastapi import APIRouter, Depends

from app.api.deps import current_auth
from app.core.clerk_auth import AuthContext

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("")
def list_workflow_templates(auth: AuthContext = Depends(current_auth)) -> dict:
    return {
        "data": [
            {
                "id": "cited_research_report",
                "name": "Cited Research Report",
                "nodes": ["planner", "search", "retrieval", "fact_checking", "payment_x402", "report", "editor"],
            },
            {
                "id": "daily_briefing",
                "name": "Daily Briefing",
                "nodes": ["schedule", "planner", "search", "payment_x402", "report", "delivery"],
            },
            {
                "id": "price_monitor",
                "name": "Price Monitor",
                "nodes": ["schedule", "product_search", "condition", "notification"],
                "checkout_enabled": False,
            },
        ]
    }

