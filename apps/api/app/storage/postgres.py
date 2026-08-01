from collections.abc import Iterable
from typing import Any, Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import delete, select

from app.db.models import StoredJobEvent, StoredRecord
from app.db.session import db_session
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


def _metadata_for(model: BaseModel) -> tuple[str | None, str | None]:
    org_id = getattr(model, "org_id", None)
    job_id = getattr(model, "job_id", None)
    return org_id, job_id


class PersistentModelDict(Generic[T]):
    def __init__(self, collection: str, model: type[T]) -> None:
        self.collection = collection
        self.model = model

    def __setitem__(self, key: str, value: T) -> None:
        org_id, job_id = _metadata_for(value)
        with db_session() as session:
            record = session.get(StoredRecord, {"collection": self.collection, "key": key})
            if record:
                record.org_id = org_id
                record.job_id = job_id
                record.data = _model_data(value)
            else:
                session.add(
                    StoredRecord(
                        collection=self.collection,
                        key=key,
                        org_id=org_id,
                        job_id=job_id,
                        data=_model_data(value),
                    )
                )

    def __getitem__(self, key: str) -> T:
        value = self.get(key)
        if value is None:
            raise KeyError(key)
        return value

    def get(self, key: str, default: T | None = None) -> T | None:
        with db_session() as session:
            record = session.get(StoredRecord, {"collection": self.collection, "key": key})
            if not record:
                return default
            return self.model.model_validate(record.data)

    def values(self) -> list[T]:
        with db_session() as session:
            records = session.scalars(
                select(StoredRecord).where(StoredRecord.collection == self.collection)
            ).all()
            return [self.model.model_validate(record.data) for record in records]

    def by_org(self, org_id: str) -> list[T]:
        with db_session() as session:
            records = session.scalars(
                select(StoredRecord).where(
                    StoredRecord.collection == self.collection,
                    StoredRecord.org_id == org_id,
                )
            ).all()
            return [self.model.model_validate(record.data) for record in records]

    def delete(self, key: str) -> None:
        with db_session() as session:
            session.execute(
                delete(StoredRecord).where(
                    StoredRecord.collection == self.collection,
                    StoredRecord.key == key,
                )
            )


class PersistentValueDict:
    def __init__(self, collection: str, default: Any = None) -> None:
        self.collection = collection
        self.default = default

    def __setitem__(self, key: str, value: Any) -> None:
        with db_session() as session:
            record = session.get(StoredRecord, {"collection": self.collection, "key": key})
            data = {"value": value}
            if record:
                record.data = data
            else:
                session.add(StoredRecord(collection=self.collection, key=key, data=data))

    def __getitem__(self, key: str) -> Any:
        return self.get(key, self.default)

    def get(self, key: str, default: Any = None) -> Any:
        with db_session() as session:
            record = session.get(StoredRecord, {"collection": self.collection, "key": key})
            if not record:
                return default
            return record.data.get("value", default)


class PersistentJobEvents:
    def append(self, event: JobEvent) -> JobEvent:
        with db_session() as session:
            session.add(
                StoredJobEvent(
                    id=event.id,
                    org_id=event.org_id,
                    job_id=event.job_id,
                    type=event.type.value,
                    data=_model_data(event),
                    created_at=event.created_at,
                )
            )
        return event

    def get(self, job_id: str, default: Iterable[JobEvent] | None = None) -> list[JobEvent]:
        with db_session() as session:
            records = session.scalars(
                select(StoredJobEvent)
                .where(StoredJobEvent.job_id == job_id)
                .order_by(StoredJobEvent.created_at, StoredJobEvent.id)
            ).all()
            if not records and default is not None:
                return list(default)
            return [JobEvent.model_validate(record.data) for record in records]


class PostgresStore:
    def __init__(self) -> None:
        self.jobs = PersistentModelDict("jobs", ResearchJob)
        self.plans = PersistentModelDict("plans", JobPlan)
        self.events = PersistentJobEvents()
        self.approvals = PersistentModelDict("approvals", PaymentApproval)
        self.pin_hashes = PersistentValueDict("pin_hashes")
        self.pin_failures = PersistentValueDict("pin_failures", default=0)
        self.provider_calls = PersistentModelDict("provider_calls", ProviderCall)
        self.receipts = PersistentModelDict("receipts", PaymentReceipt)
        self.evidence = PersistentModelDict("evidence", EvidenceItem)
        self.reports = PersistentModelDict("reports", Report)
        self.schedules = PersistentModelDict("schedules", Schedule)

    def add_event(self, event: JobEvent) -> JobEvent:
        return self.events.append(event)

    def org_jobs(self, org_id: str) -> list[ResearchJob]:
        return self.jobs.by_org(org_id)

    def org_schedules(self, org_id: str) -> list[Schedule]:
        return self.schedules.by_org(org_id)
