from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from app.core.config import Settings, get_settings

router = APIRouter(tags=["health"])


def _database_ready(settings: Settings) -> bool:
    if settings.storage_backend == "memory":
        return True
    try:
        if settings.storage_backend == "mongodb":
            from app.storage.memory import store

            store.ping()
            return True
        if settings.storage_backend != "postgres":
            return False
        from app.db.session import engine

        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@router.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, str | bool]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "storage_backend": settings.storage_backend,
        "auth_required": settings.auth_required,
        "job_queue_backend": settings.job_queue_backend,
        "redis_configured": bool(settings.upstash_redis_rest_url and settings.upstash_redis_rest_token),
    }


@router.get("/health/live")
def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
def readiness(settings: Settings = Depends(get_settings)) -> dict[str, str | bool]:
    database_ready = _database_ready(settings)
    if not database_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready",
        )
    return {
        "status": "ready",
        "database": database_ready,
        "research_provider_configured": bool(settings.tavily_api_key or settings.brave_search_api_key),
        "model_configured": bool(settings.deepseek_api_key),
    }
