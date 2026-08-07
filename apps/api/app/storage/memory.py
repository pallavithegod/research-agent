from collections import defaultdict
from typing import TypeVar

from app.domain.schemas import (
    EvidenceItem,
    JobEvent,
    JobPlan,
    PaymentApproval,
    PaymentReceipt,
    ProviderCall,
    Report,
    ResearchJob,
    Schedule,
)
from app.core.config import get_settings

T = TypeVar("T")


class MemoryStore:
    def __init__(self) -> None:
        self.jobs: dict[str, ResearchJob] = {}
        self.plans: dict[str, JobPlan] = {}
        self.events: dict[str, list[JobEvent]] = defaultdict(list)
        self.approvals: dict[str, PaymentApproval] = {}
        self.pin_hashes: dict[str, str] = {}
        self.pin_failures: dict[str, int] = defaultdict(int)
        self.provider_calls: dict[str, ProviderCall] = {}
        self.receipts: dict[str, PaymentReceipt] = {}
        self.evidence: dict[str, EvidenceItem] = {}
        self.reports: dict[str, Report] = {}
        self.schedules: dict[str, Schedule] = {}

    def add_event(self, event: JobEvent) -> JobEvent:
        self.events[event.job_id].append(event)
        return event

    def org_jobs(self, org_id: str) -> list[ResearchJob]:
        return [job for job in self.jobs.values() if job.org_id == org_id]

    def org_schedules(self, org_id: str) -> list[Schedule]:
        return [schedule for schedule in self.schedules.values() if schedule.org_id == org_id]


settings = get_settings()
if settings.storage_backend == "memory":
    store = MemoryStore()
elif settings.storage_backend == "postgres":
    from app.storage.postgres import PostgresStore

    store = PostgresStore()
elif settings.storage_backend == "mongodb":
    from app.storage.mongodb import MongoStore

    store = MongoStore()
else:
    raise RuntimeError(f"Unsupported STORAGE_BACKEND: {settings.storage_backend}")
