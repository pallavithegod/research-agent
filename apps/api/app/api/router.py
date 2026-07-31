from fastapi import APIRouter

from app.api.routers import approvals, auth, health, jobs, payment_pin, products, reports, schedules, tool_calls, workflows

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(jobs.router)
api_router.include_router(payment_pin.router)
api_router.include_router(approvals.router)
api_router.include_router(tool_calls.router)
api_router.include_router(reports.router)
api_router.include_router(schedules.router)
api_router.include_router(products.router)
api_router.include_router(workflows.router)

