from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, str | bool]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "auth_required": settings.auth_required,
        "job_queue_backend": settings.job_queue_backend,
        "redis_configured": bool(settings.upstash_redis_rest_url and settings.upstash_redis_rest_token),
    }
