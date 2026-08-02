import json
from typing import Any

from app.core.config import Settings, get_settings
from app.domain.schemas import ResearchJob


class JobQueueService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @property
    def is_enabled(self) -> bool:
        return self.settings.job_queue_backend == "upstash"

    def enqueue_research_job(self, job: ResearchJob) -> bool:
        if not self.is_enabled:
            return False

        redis = self._client()
        payload = {
            "job_id": job.id,
            "org_id": job.org_id,
            "user_id": job.user_id,
        }
        redis.lpush(self.settings.research_job_queue_name, json.dumps(payload))
        return True

    def dequeue_research_job(self) -> dict[str, Any] | None:
        if not self.is_enabled:
            return None

        redis = self._client()
        item = redis.rpop(self.settings.research_job_queue_name)
        if item is None:
            return None
        if isinstance(item, bytes):
            item = item.decode("utf-8")
        return json.loads(str(item))

    def _client(self):
        if not self.settings.upstash_redis_rest_url or not self.settings.upstash_redis_rest_token:
            raise RuntimeError("Upstash Redis is not configured.")

        from upstash_redis import Redis

        return Redis(url=self.settings.upstash_redis_rest_url, token=self.settings.upstash_redis_rest_token)


job_queue_service = JobQueueService()
