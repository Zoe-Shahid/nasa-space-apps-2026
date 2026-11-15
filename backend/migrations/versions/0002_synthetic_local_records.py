"""Add local synthetic profiles and append-only records.

Revision ID: 0002_synthetic_local_records
Revises: 0001_initial_baseline
"""

import sqlalchemy as sa
from alembic import op

revision = "0002_synthetic_local_records"
down_revision = "0001_initial_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("is_synthetic", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("length(display_name) BETWEEN 1 AND 120", name="ck_profiles_display_name_length"),
        sa.CheckConstraint("is_synthetic IS TRUE", name="ck_profiles_synthetic_only"),
        sa.PrimaryKeyConstraint("id", name="pk_profiles"),
    )
    op.create_index("ix_profiles_created_id", "profiles", ["created_at", "id"], unique=False)
    op.create_table(
        "vital_observations",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("profile_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("client_record_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("metric", sa.String(length=32), nullable=False),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("systolic", sa.Float(), nullable=True),
        sa.Column("diastolic", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(length=8), nullable=False),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("quality", sa.String(length=16), nullable=False),
        sa.Column("is_synthetic", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "(metric = 'heart_rate' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit = 'bpm') OR "
            "(metric = 'body_temperature' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit = '°C') OR "
            "(metric = 'blood_pressure' AND value IS NULL AND systolic IS NOT NULL AND diastolic IS NOT NULL AND unit = 'mmHg')",
            name="ck_vital_observations_metric_value_shape",
        ),
        sa.CheckConstraint(
            "((value IS NULL OR (value > 0 AND value <= 1.7976931348623157e308)) AND "
            "(systolic IS NULL OR (systolic > 0 AND systolic <= 1.7976931348623157e308)) AND "
            "(diastolic IS NULL OR (diastolic > 0 AND diastolic <= 1.7976931348623157e308)))",
            name="ck_vital_observations_positive_finite_values",
        ),
        sa.CheckConstraint("source IN ('manual', 'simulated_device')", name="ck_vital_observations_source_enum"),
        sa.CheckConstraint("quality IN ('valid', 'suspect', 'invalid')", name="ck_vital_observations_quality_enum"),
        sa.CheckConstraint("is_synthetic IS TRUE", name="ck_vital_observations_synthetic_only"),
        sa.ForeignKeyConstraint(
            ["profile_id"], ["profiles.id"], name="fk_vital_observations_profile_id_profiles", ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_vital_observations"),
        sa.UniqueConstraint("profile_id", "client_record_id", name="uq_vital_profile_client_record"),
    )
    op.create_index(
        "ix_vital_profile_created_id",
        "vital_observations",
        ["profile_id", "created_at", "id"],
        unique=False,
    )
    op.create_table(
        "sleep_records",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("profile_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("client_record_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("reporting_date", sa.Date(), nullable=False),
        sa.Column("includes_naps", sa.Boolean(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("quality", sa.String(length=16), nullable=False),
        sa.Column("is_synthetic", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("duration_minutes > 0", name="ck_sleep_records_positive_duration"),
        sa.CheckConstraint("source IN ('manual', 'simulated_device')", name="ck_sleep_records_source_enum"),
        sa.CheckConstraint("quality IN ('valid', 'suspect', 'invalid')", name="ck_sleep_records_quality_enum"),
        sa.CheckConstraint("is_synthetic IS TRUE", name="ck_sleep_records_synthetic_only"),
        sa.ForeignKeyConstraint(
            ["profile_id"], ["profiles.id"], name="fk_sleep_records_profile_id_profiles", ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sleep_records"),
        sa.UniqueConstraint("profile_id", "client_record_id", name="uq_sleep_profile_client_record"),
    )
    op.create_index(
        "ix_sleep_profile_created_id",
        "sleep_records",
        ["profile_id", "created_at", "id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_sleep_profile_created_id", table_name="sleep_records")
    op.drop_table("sleep_records")
    op.drop_index("ix_vital_profile_created_id", table_name="vital_observations")
    op.drop_table("vital_observations")
    op.drop_index("ix_profiles_created_id", table_name="profiles")
    op.drop_table("profiles")
