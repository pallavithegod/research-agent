"""initial persistence tables

Revision ID: 20260802_0001
Revises:
Create Date: 2026-08-02 00:00:00 UTC
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260802_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "app_records",
        sa.Column("collection", sa.String(length=64), nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("org_id", sa.String(length=128), nullable=True),
        sa.Column("job_id", sa.String(length=128), nullable=True),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("collection", "key"),
    )
    op.create_index("ix_app_records_collection_job", "app_records", ["collection", "job_id"])
    op.create_index("ix_app_records_collection_org", "app_records", ["collection", "org_id"])
    op.create_index("ix_app_records_job_id", "app_records", ["job_id"])
    op.create_index("ix_app_records_org_id", "app_records", ["org_id"])

    op.create_table(
        "job_events",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("org_id", sa.String(length=128), nullable=False),
        sa.Column("job_id", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_events_created_at", "job_events", ["created_at"])
    op.create_index("ix_job_events_job_created", "job_events", ["job_id", "created_at"])
    op.create_index("ix_job_events_job_id", "job_events", ["job_id"])
    op.create_index("ix_job_events_org_id", "job_events", ["org_id"])
    op.create_index("ix_job_events_type", "job_events", ["type"])


def downgrade() -> None:
    op.drop_index("ix_job_events_type", table_name="job_events")
    op.drop_index("ix_job_events_org_id", table_name="job_events")
    op.drop_index("ix_job_events_job_id", table_name="job_events")
    op.drop_index("ix_job_events_job_created", table_name="job_events")
    op.drop_index("ix_job_events_created_at", table_name="job_events")
    op.drop_table("job_events")

    op.drop_index("ix_app_records_org_id", table_name="app_records")
    op.drop_index("ix_app_records_job_id", table_name="app_records")
    op.drop_index("ix_app_records_collection_org", table_name="app_records")
    op.drop_index("ix_app_records_collection_job", table_name="app_records")
    op.drop_table("app_records")
