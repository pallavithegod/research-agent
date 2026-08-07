from __future__ import annotations

from collections.abc import Iterable
from typing import Any, Generic, TypeVar

from pydantic import BaseModel
from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.core.config import get_settings
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

T = TypeVar("T", bound=BaseModel)


def _model_data(model: BaseModel) -> dict[str, Any]:
    return model.model_dump(mode="json")


class MongoModelDict(Generic[T]):
    def __init__(self, database: Database, collection: str, model: type[T]) -> None:
        self.collection: Collection = database[collection]
        self.model = model

    def __setitem__(self, key: str, value: T) -> None:
        data = _model_data(value)
        self.collection.replace_one(
            {"_id": key},
            {
                "_id": key,
                "org_id": data.get("org_id"),
                "job_id": data.get("job_id"),
                "data": data,
            },
            upsert=True,
        )

    def __getitem__(self, key: str) -> T:
        value = self.get(key)
        if value is None:
            raise KeyError(key)
        return value

    def get(self, key: str, default: T | None = None) -> T | None:
        document = self.collection.find_one({"_id": key}, {"data": 1})
        return self.model.model_validate(document["data"]) if document else default

    def values(self) -> list[T]:
        return [self.model.model_validate(document["data"]) for document in self.collection.find({}, {"data": 1})]

    def by_org(self, org_id: str) -> list[T]:
        return [
            self.model.model_validate(document["data"])
            for document in self.collection.find({"org_id": org_id}, {"data": 1})
        ]

    def delete(self, key: str) -> None:
        self.collection.delete_one({"_id": key})


class MongoValueDict:
    def __init__(self, database: Database, collection: str, default: Any = None) -> None:
        self.collection: Collection = database[collection]
        self.default = default

    def __setitem__(self, key: str, value: Any) -> None:
        self.collection.replace_one({"_id": key}, {"_id": key, "value": value}, upsert=True)

    def __getitem__(self, key: str) -> Any:
        return self.get(key, self.default)

    def get(self, key: str, default: Any = None) -> Any:
        document = self.collection.find_one({"_id": key}, {"value": 1})
        return document.get("value", default) if document else default


class MongoJobEvents:
    def __init__(self, database: Database) -> None:
        self.collection: Collection = database["job_events"]

    def append(self, event: JobEvent) -> JobEvent:
        data = _model_data(event)
        self.collection.replace_one(
            {"_id": event.id},
            {
                "_id": event.id,
                "org_id": event.org_id,
                "job_id": event.job_id,
                "created_at": event.created_at,
                "data": data,
            },
            upsert=True,
        )
        return event

    def get(self, job_id: str, default: Iterable[JobEvent] | None = None) -> list[JobEvent]:
        documents = self.collection.find({"job_id": job_id}, {"data": 1}).sort(
            [("created_at", ASCENDING), ("_id", ASCENDING)]
        )
        events = [JobEvent.model_validate(document["data"]) for document in documents]
        return events if events or default is None else list(default)


class MongoStore:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.mongodb_uri:
            raise RuntimeError("MONGODB_URI is required when STORAGE_BACKEND=mongodb")
        self.client: MongoClient = MongoClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=settings.mongodb_server_selection_timeout_ms,
            appname=settings.mongodb_app_name,
            uuidRepresentation="standard",
        )
        self.database = self.client[settings.mongodb_database]
        self.jobs = MongoModelDict(self.database, "jobs", ResearchJob)
        self.plans = MongoModelDict(self.database, "plans", JobPlan)
        self.events = MongoJobEvents(self.database)
        self.approvals = MongoModelDict(self.database, "approvals", PaymentApproval)
        self.pin_hashes = MongoValueDict(self.database, "pin_hashes")
        self.pin_failures = MongoValueDict(self.database, "pin_failures", default=0)
        self.provider_calls = MongoModelDict(self.database, "provider_calls", ProviderCall)
        self.receipts = MongoModelDict(self.database, "receipts", PaymentReceipt)
        self.evidence = MongoModelDict(self.database, "evidence", EvidenceItem)
        self.reports = MongoModelDict(self.database, "reports", Report)
        self.schedules = MongoModelDict(self.database, "schedules", Schedule)
        self._indexes_ready = False

    def _ensure_indexes(self) -> None:
        for collection in (
            self.jobs.collection,
            self.plans.collection,
            self.approvals.collection,
            self.provider_calls.collection,
            self.receipts.collection,
            self.evidence.collection,
            self.reports.collection,
            self.schedules.collection,
        ):
            collection.create_index([("org_id", ASCENDING)])
            collection.create_index([("job_id", ASCENDING)])
        self.events.collection.create_index([("job_id", ASCENDING), ("created_at", ASCENDING)])
        self.events.collection.create_index([("org_id", ASCENDING)])

    def ping(self) -> None:
        self.client.admin.command("ping")
        if not self._indexes_ready:
            self._ensure_indexes()
            self._indexes_ready = True

    def add_event(self, event: JobEvent) -> JobEvent:
        return self.events.append(event)

    def org_jobs(self, org_id: str) -> list[ResearchJob]:
        return self.jobs.by_org(org_id)

    def org_schedules(self, org_id: str) -> list[Schedule]:
        return self.schedules.by_org(org_id)
