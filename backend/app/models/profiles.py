import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import DecimalText, UTCDateTime
from app.models.users import User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Profile(Base):
    __tablename__ = "profiles"

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_profiles_user_id"),
        UniqueConstraint("id", "is_synthetic", name="uq_profiles_id_synthetic"),
        CheckConstraint("length(display_name) BETWEEN 1 AND 120", name="display_name_length"),
        CheckConstraint(
            "(is_synthetic IS TRUE AND user_id IS NULL) OR "
            "(is_synthetic IS FALSE AND user_id IS NOT NULL)",
            name="owner_mode",
        ),
        Index("ix_profiles_created_id", "created_at", "id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now, onupdate=utc_now)

    user: Mapped[User | None] = relationship(back_populates="profile")
    observations: Mapped[list["VitalObservation"]] = relationship(back_populates="profile")
    sleep_records: Mapped[list["SleepRecord"]] = relationship(back_populates="profile")


class VitalObservation(Base):
    __tablename__ = "vital_observations"
    __table_args__ = (
        UniqueConstraint("profile_id", "client_record_id", name="uq_vital_profile_client_record"),
        ForeignKeyConstraint(
            ["profile_id", "is_synthetic"],
            ["profiles.id", "profiles.is_synthetic"],
            name="fk_vital_profile_mode",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "(metric = 'heart_rate' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit = 'bpm') OR "
            "(metric = 'body_temperature' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit IN ('°C', '°F')) OR "
            "(metric = 'blood_glucose' AND value IS NOT NULL AND systolic IS NULL AND diastolic IS NULL AND unit IN ('mg/dL', 'mmol/L')) OR "
            "(metric = 'blood_pressure' AND value IS NULL AND systolic IS NOT NULL AND diastolic IS NOT NULL AND unit = 'mmHg')",
            name="metric_value_shape",
        ),
        CheckConstraint(
            "((value IS NULL OR CAST(value AS NUMERIC) > 0) AND "
            "(systolic IS NULL OR CAST(systolic AS NUMERIC) > 0) AND "
            "(diastolic IS NULL OR CAST(diastolic AS NUMERIC) > 0))",
            name="positive_finite_values",
        ),
        CheckConstraint("source IN ('manual', 'simulated_device')", name="source_enum"),
        CheckConstraint("quality IS NULL OR quality IN ('valid', 'suspect', 'invalid')", name="quality_enum"),
        Index("ix_vital_profile_created_id", "profile_id", "created_at", "id"),
        Index("ix_vital_profile_measured_id", "profile_id", "measured_at", "id"),
        Index("ix_vital_profile_metric_measured", "profile_id", "metric", "measured_at", "id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    client_record_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    metric: Mapped[str] = mapped_column(String(32), nullable=False)
    value: Mapped[str | None] = mapped_column(DecimalText(), nullable=True)
    systolic: Mapped[str | None] = mapped_column(DecimalText(), nullable=True)
    diastolic: Mapped[str | None] = mapped_column(DecimalText(), nullable=True)
    unit: Mapped[str] = mapped_column(String(8), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    measured_at_input: Mapped[str | None] = mapped_column(String(64), nullable=True)
    time_zone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    quality: Mapped[str | None] = mapped_column(String(16), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now, onupdate=utc_now)

    profile: Mapped[Profile] = relationship(back_populates="observations")


class SleepRecord(Base):
    __tablename__ = "sleep_records"
    __table_args__ = (
        UniqueConstraint("profile_id", "client_record_id", name="uq_sleep_profile_client_record"),
        ForeignKeyConstraint(
            ["profile_id", "is_synthetic"],
            ["profiles.id", "profiles.is_synthetic"],
            name="fk_sleep_profile_mode",
            ondelete="RESTRICT",
        ),
        CheckConstraint("duration_minutes IS NULL OR duration_minutes > 0", name="duration_minutes_positive"),
        CheckConstraint("duration_value IS NULL OR CAST(duration_value AS NUMERIC) > 0", name="positive_duration_value"),
        CheckConstraint("unit IN ('h', 'min')", name="duration_unit"),
        CheckConstraint("source IN ('manual', 'simulated_device')", name="source_enum"),
        CheckConstraint("quality IS NULL OR quality IN ('valid', 'suspect', 'invalid')", name="quality_enum"),
        Index("ix_sleep_profile_created_id", "profile_id", "created_at", "id"),
        Index("ix_sleep_profile_measured_id", "profile_id", "measured_at", "id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    client_record_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    duration_value: Mapped[str | None] = mapped_column(DecimalText(), nullable=True)
    unit: Mapped[str] = mapped_column(String(8), nullable=False, default="min", server_default=text("'min'"))
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reporting_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    includes_naps: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    measured_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    measured_at_input: Mapped[str | None] = mapped_column(String(64), nullable=True)
    time_zone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    quality: Mapped[str | None] = mapped_column(String(16), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now, onupdate=utc_now)

    profile: Mapped[Profile] = relationship(back_populates="sleep_records")

    def __init__(self, **kwargs):
        if "duration_value" not in kwargs and kwargs.get("duration_minutes") is not None and kwargs["duration_minutes"] > 0:
            kwargs["duration_value"] = str(kwargs["duration_minutes"])
        if "unit" not in kwargs or kwargs["unit"] is None:
            kwargs["unit"] = "min"
        super().__init__(**kwargs)
