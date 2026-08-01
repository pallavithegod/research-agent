from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Index, JSON, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class StoredRecord(Base):
    __tablename__ = "app_records"

    collection: Mapped[str] = mapped_column(String(64), primary_key=True)
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    org_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    job_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class StoredJobEvent(Base):
    __tablename__ = "job_events"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    org_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    job_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)


Index("ix_app_records_collection_org", StoredRecord.collection, StoredRecord.org_id)
Index("ix_app_records_collection_job", StoredRecord.collection, StoredRecord.job_id)
Index("ix_job_events_job_created", StoredJobEvent.job_id, StoredJobEvent.created_at)
