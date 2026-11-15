"""Add user ownership and actual MVP measurement fields.

Revision ID: 0003_actual_mvp_persistence
Revises: 0002_synthetic_local_records
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "0003_actual_mvp_persistence"
down_revision = "0002_synthetic_local_records"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=256), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("length(email) BETWEEN 3 AND 254", name="email_length"),
        sa.CheckConstraint("length(password_hash) BETWEEN 1 AND 256", name="password_hash_length"),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("expires_at > created_at", name="expiry_after_creation"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_user_sessions_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_user_sessions"),
        sa.UniqueConstraint("token_hash", name="uq_user_sessions_token_hash"),
    )
    op.create_index("ix_user_sessions_user_expires", "user_sessions", ["user_id", "expires_at"], unique=False)

    with op.batch_alter_table("profiles", recreate="always") as batch:
        batch.drop_constraint(op.f("ck_profiles_ck_profiles_display_name_length"), type_="check")
        batch.drop_constraint(op.f("ck_profiles_ck_profiles_synthetic_only"), type_="check")
        batch.add_column(sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=True))
        batch.add_column(
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False)
        )
        batch.create_foreign_key("fk_profiles_user_id_users", "users", ["user_id"], ["id"], ondelete="RESTRICT")
        batch.create_unique_constraint("uq_profiles_user_id", ["user_id"])
        batch.create_unique_constraint("uq_profiles_id_synthetic", ["id", "is_synthetic"])
        batch.create_check_constraint(
            "owner_mode",
            "(is_synthetic IS TRUE AND user_id IS NULL) OR "
            "(is_synthetic IS FALSE AND user_id IS NOT NULL)",
        )
        batch.create_check_constraint("display_name_length", "length(display_name) BETWEEN 1 AND 120")
    op.execute(text("UPDATE profiles SET updated_at = created_at"))

    with op.batch_alter_table("vital_observations", recreate="always") as batch:
        batch.drop_constraint("fk_vital_observations_profile_id_profiles", type_="foreignkey")
        batch.drop_constraint(op.f("ck_vital_observations_ck_vital_observations_metric_value_shape"), type_="check")
        batch.drop_constraint(
            op.f("ck_vital_observations_ck_vital_observations_positive_finite_values"), type_="check"
        )
        batch.drop_constraint(op.f("ck_vital_observations_ck_vital_observations_synthetic_only"), type_="check")
        batch.drop_constraint(op.f("ck_vital_observations_ck_vital_observations_source_enum"), type_="check")
        batch.drop_constraint(op.f("ck_vital_observations_ck_vital_observations_quality_enum"), type_="check")
        batch.alter_column("value", existing_type=sa.Float(), type_=sa.String(length=64), existing_nullable=True)
        batch.alter_column("systolic", existing_type=sa.Float(), type_=sa.String(length=64), existing_nullable=True)
        batch.alter_column("diastolic", existing_type=sa.Float(), type_=sa.String(length=64), existing_nullable=True)
        batch.alter_column("quality", existing_type=sa.String(length=16), nullable=True)
        batch.add_column(sa.Column("measured_at_input", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("time_zone", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("note", sa.Text(), nullable=True))
        batch.add_column(
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False)
        )
        batch.create_foreign_key(
            "fk_vital_profile_mode",
            "profiles",
            ["profile_id", "is_synthetic"],
            ["id", "is_synthetic"],
            ondelete="RESTRICT",
        )
        batch.create_check_constraint(
            "metric_value_shape",
            "(metric = 'heart_rate' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit = 'bpm') OR "
            "(metric = 'body_temperature' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit IN ('°C', '°F')) OR "
            "(metric = 'blood_glucose' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit IN ('mg/dL', 'mmol/L')) OR "
            "(metric = 'blood_pressure' AND value IS NULL AND systolic IS NOT NULL AND diastolic IS NOT NULL AND unit = 'mmHg')",
        )
        batch.create_check_constraint(
            "positive_finite_values",
            "((value IS NULL OR CAST(value AS NUMERIC) > 0) AND "
            "(systolic IS NULL OR CAST(systolic AS NUMERIC) > 0) AND "
            "(diastolic IS NULL OR CAST(diastolic AS NUMERIC) > 0))",
        )
        batch.create_check_constraint("source_enum", "source IN ('manual', 'simulated_device')")
        batch.create_check_constraint("quality_enum", "quality IS NULL OR quality IN ('valid', 'suspect', 'invalid')")
    op.execute(text("UPDATE vital_observations SET updated_at = created_at"))
    op.create_index(
        "ix_vital_profile_measured_id", "vital_observations", ["profile_id", "measured_at", "id"], unique=False
    )
    op.create_index(
        "ix_vital_profile_metric_measured",
        "vital_observations",
        ["profile_id", "metric", "measured_at", "id"],
        unique=False,
    )

    with op.batch_alter_table("sleep_records", recreate="always") as batch:
        batch.drop_constraint("fk_sleep_records_profile_id_profiles", type_="foreignkey")
        batch.drop_constraint(op.f("ck_sleep_records_ck_sleep_records_positive_duration"), type_="check")
        batch.drop_constraint(op.f("ck_sleep_records_ck_sleep_records_synthetic_only"), type_="check")
        batch.drop_constraint(op.f("ck_sleep_records_ck_sleep_records_quality_enum"), type_="check")
        batch.drop_constraint(op.f("ck_sleep_records_ck_sleep_records_source_enum"), type_="check")
        batch.alter_column("duration_minutes", existing_type=sa.Integer(), nullable=True)
        batch.alter_column("reporting_date", existing_type=sa.Date(), nullable=True)
        batch.alter_column("includes_naps", existing_type=sa.Boolean(), nullable=True)
        batch.alter_column("quality", existing_type=sa.String(length=16), nullable=True)
        batch.add_column(sa.Column("duration_value", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("unit", sa.String(length=8), nullable=True))
        batch.add_column(sa.Column("measured_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("measured_at_input", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("time_zone", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("note", sa.Text(), nullable=True))
        batch.add_column(
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False)
        )
        batch.create_foreign_key(
            "fk_sleep_profile_mode",
            "profiles",
            ["profile_id", "is_synthetic"],
            ["id", "is_synthetic"],
            ondelete="RESTRICT",
        )
        batch.create_check_constraint("positive_duration", "duration_minutes IS NULL OR duration_minutes > 0")
        batch.create_check_constraint(
            "positive_duration_value", "duration_value IS NULL OR CAST(duration_value AS NUMERIC) > 0"
        )
        batch.create_check_constraint("duration_unit", "unit IS NULL OR unit IN ('h', 'min')")
        batch.create_check_constraint("source_enum", "source IN ('manual', 'simulated_device')")
        batch.create_check_constraint("quality_enum", "quality IS NULL OR quality IN ('valid', 'suspect', 'invalid')")
    op.execute(
        text(
            "UPDATE sleep_records SET duration_value = CAST(duration_minutes AS TEXT), "
            "unit = 'min', updated_at = created_at WHERE duration_value IS NULL"
        )
    )
    with op.batch_alter_table("sleep_records", recreate="always") as batch:
        batch.alter_column("duration_value", existing_type=sa.String(length=64), nullable=False)
        batch.alter_column("unit", existing_type=sa.String(length=8), nullable=False)
    op.create_index(
        "ix_sleep_profile_measured_id", "sleep_records", ["profile_id", "measured_at", "id"], unique=False
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.execute(text("SELECT COUNT(*) FROM users")).scalar_one():
        raise RuntimeError("Cannot downgrade while user accounts exist; preserve account data before downgrade.")
    if bind.execute(text("SELECT COUNT(*) FROM profiles WHERE is_synthetic IS FALSE")).scalar_one():
        raise RuntimeError("Cannot downgrade while actual user profiles exist; preserve actual data before downgrade.")
    if bind.execute(text("SELECT COUNT(*) FROM vital_observations WHERE is_synthetic IS FALSE")).scalar_one():
        raise RuntimeError("Cannot downgrade while actual vital observations exist; preserve actual data before downgrade.")
    if bind.execute(text("SELECT COUNT(*) FROM sleep_records WHERE is_synthetic IS FALSE")).scalar_one():
        raise RuntimeError("Cannot downgrade while actual sleep records exist; preserve actual data before downgrade.")
    if bind.execute(
        text("SELECT COUNT(*) FROM vital_observations WHERE metric = 'blood_glucose' OR unit = '°F'")
    ).scalar_one():
        raise RuntimeError("Cannot downgrade while glucose or Fahrenheit observations exist.")
    if bind.execute(text("SELECT COUNT(*) FROM sleep_records WHERE unit = 'h'")).scalar_one():
        raise RuntimeError("Cannot downgrade while hour-based sleep records exist.")

    op.drop_index("ix_sleep_profile_measured_id", table_name="sleep_records")
    with op.batch_alter_table("sleep_records", recreate="always") as batch:
        batch.drop_constraint("fk_sleep_profile_mode", type_="foreignkey")
        batch.drop_constraint(op.f("ck_sleep_records_positive_duration"), type_="check")
        batch.drop_constraint(op.f("ck_sleep_records_positive_duration_value"), type_="check")
        batch.drop_constraint(op.f("ck_sleep_records_duration_unit"), type_="check")
        batch.drop_constraint(op.f("ck_sleep_records_source_enum"), type_="check")
        batch.drop_constraint(op.f("ck_sleep_records_quality_enum"), type_="check")
        batch.drop_column("duration_value")
        batch.drop_column("unit")
        batch.drop_column("measured_at")
        batch.drop_column("measured_at_input")
        batch.drop_column("time_zone")
        batch.drop_column("note")
        batch.drop_column("updated_at")
        batch.alter_column("duration_minutes", existing_type=sa.Integer(), nullable=False)
        batch.alter_column("reporting_date", existing_type=sa.Date(), nullable=False)
        batch.alter_column("includes_naps", existing_type=sa.Boolean(), nullable=False)
        batch.alter_column("quality", existing_type=sa.String(length=16), nullable=False)
        batch.create_foreign_key(
            "fk_sleep_records_profile_id_profiles", "profiles", ["profile_id"], ["id"], ondelete="RESTRICT"
        )
        batch.create_check_constraint("positive_duration", "duration_minutes > 0")
        batch.create_check_constraint("source_enum", "source IN ('manual', 'simulated_device')")
        batch.create_check_constraint("quality_enum", "quality IN ('valid', 'suspect', 'invalid')")
        batch.create_check_constraint("synthetic_only", "is_synthetic IS TRUE")

    op.drop_index("ix_vital_profile_metric_measured", table_name="vital_observations")
    op.drop_index("ix_vital_profile_measured_id", table_name="vital_observations")
    with op.batch_alter_table("vital_observations", recreate="always") as batch:
        batch.drop_constraint("fk_vital_profile_mode", type_="foreignkey")
        batch.drop_constraint(op.f("ck_vital_observations_metric_value_shape"), type_="check")
        batch.drop_constraint(op.f("ck_vital_observations_positive_finite_values"), type_="check")
        batch.drop_constraint(op.f("ck_vital_observations_source_enum"), type_="check")
        batch.drop_constraint(op.f("ck_vital_observations_quality_enum"), type_="check")
        batch.drop_column("measured_at_input")
        batch.drop_column("time_zone")
        batch.drop_column("note")
        batch.drop_column("updated_at")
        batch.alter_column("value", existing_type=sa.String(length=64), type_=sa.Float(), nullable=True)
        batch.alter_column("systolic", existing_type=sa.String(length=64), type_=sa.Float(), nullable=True)
        batch.alter_column("diastolic", existing_type=sa.String(length=64), type_=sa.Float(), nullable=True)
        batch.alter_column("quality", existing_type=sa.String(length=16), nullable=False)
        batch.create_foreign_key(
            "fk_vital_observations_profile_id_profiles", "profiles", ["profile_id"], ["id"], ondelete="RESTRICT"
        )
        batch.create_check_constraint(
            "metric_value_shape",
            "(metric = 'heart_rate' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit = 'bpm') OR "
            "(metric = 'body_temperature' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit = '°C') OR "
            "(metric = 'blood_pressure' AND value IS NULL AND systolic IS NOT NULL AND diastolic IS NOT NULL AND unit = 'mmHg')",
        )
        batch.create_check_constraint(
            "positive_finite_values",
            "((value IS NULL OR (value > 0 AND value <= 1.7976931348623157e308)) AND "
            "(systolic IS NULL OR (systolic > 0 AND systolic <= 1.7976931348623157e308)) AND "
            "(diastolic IS NULL OR (diastolic > 0 AND diastolic <= 1.7976931348623157e308)))",
        )
        batch.create_check_constraint("source_enum", "source IN ('manual', 'simulated_device')")
        batch.create_check_constraint("quality_enum", "quality IN ('valid', 'suspect', 'invalid')")
        batch.create_check_constraint("synthetic_only", "is_synthetic IS TRUE")

    with op.batch_alter_table("profiles", recreate="always") as batch:
        batch.drop_constraint("fk_profiles_user_id_users", type_="foreignkey")
        batch.drop_constraint("uq_profiles_user_id", type_="unique")
        batch.drop_constraint("uq_profiles_id_synthetic", type_="unique")
        batch.drop_constraint(op.f("ck_profiles_owner_mode"), type_="check")
        batch.drop_column("user_id")
        batch.drop_column("updated_at")
        batch.create_check_constraint("synthetic_only", "is_synthetic IS TRUE")

    op.drop_index("ix_user_sessions_user_expires", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_table("users")