from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_auth
from app.core.clerk_auth import AuthContext
from app.domain.schemas import Schedule, ScheduleCreate
from app.storage.memory import store

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_schedule(payload: ScheduleCreate, auth: AuthContext = Depends(current_auth)) -> dict:
    schedule = Schedule(org_id=auth.org_id, user_id=auth.user_id, **payload.model_dump())
    store.schedules[schedule.id] = schedule
    return {"schedule": schedule}


@router.get("")
def list_schedules(auth: AuthContext = Depends(current_auth)) -> dict:
    return {"data": store.org_schedules(auth.org_id)}


@router.patch("/{schedule_id}")
def update_schedule(schedule_id: str, payload: dict, auth: AuthContext = Depends(current_auth)) -> dict:
    schedule = store.schedules.get(schedule_id)
    if not schedule or schedule.org_id != auth.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    for key, value in payload.items():
        if key in {"name", "query", "timezone", "rrule", "enabled", "delivery_targets"}:
            setattr(schedule, key, value)
    store.schedules[schedule.id] = schedule
    return {"schedule": schedule}


@router.post("/{schedule_id}/pause")
def pause_schedule(schedule_id: str, auth: AuthContext = Depends(current_auth)) -> dict:
    schedule = store.schedules.get(schedule_id)
    if not schedule or schedule.org_id != auth.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    schedule.enabled = False
    store.schedules[schedule.id] = schedule
    return {"schedule": schedule}

