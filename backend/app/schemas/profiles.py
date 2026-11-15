import re
import uuid
from datetime import date, datetime, timezone
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator, field_serializer

RFC3339_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)
RecordSource = Literal["manual", "simulated_device"]
RecordQuality = Literal["valid", "suspect", "invalid"]


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProfileResponse(StrictSchema):
    id: uuid.UUID
    display_name: str = Field(min_length=1, max_length=120)
    is_synthetic: Literal[True]


class PaginationQuery(StrictSchema):
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class ProfileCollection(StrictSchema):
    items: list[ProfileResponse]
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)


class CreateRecordBase(StrictSchema):
    client_record_id: uuid.UUID
    source: RecordSource
    quality: RecordQuality


class TimedObservationBase(CreateRecordBase):
    measured_at: datetime = Field(
        json_schema_extra={"pattern": RFC3339_PATTERN.pattern},
    )

    @field_validator("measured_at", mode="before")
    @classmethod
    def require_rfc3339_instant(cls, value: object) -> object:
        if not isinstance(value, str) or not RFC3339_PATTERN.fullmatch(value):
            raise ValueError("must be an RFC3339 instant with an explicit offset")
        return value

    @field_validator("measured_at")
    @classmethod
    def normalize_measured_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("must include an explicit UTC offset")
        return value.astimezone(timezone.utc)


class HeartRateCreate(TimedObservationBase):
    metric: Literal["heart_rate"]
    value: float = Field(gt=0, allow_inf_nan=False, strict=True)
    unit: Literal["bpm"]


class BloodPressureCreate(TimedObservationBase):
    metric: Literal["blood_pressure"]
    systolic: float = Field(gt=0, allow_inf_nan=False, strict=True)
    diastolic: float = Field(gt=0, allow_inf_nan=False, strict=True)
    unit: Literal["mmHg"]


class BodyTemperatureCreate(TimedObservationBase):
    metric: Literal["body_temperature"]
    value: float = Field(gt=0, allow_inf_nan=False, strict=True)
    unit: Literal["°C"]


ObservationCreate = Annotated[
    Union[HeartRateCreate, BloodPressureCreate, BodyTemperatureCreate],
    Field(discriminator="metric"),
]


class ObservationBase(StrictSchema):
    id: uuid.UUID
    profile_id: uuid.UUID
    client_record_id: uuid.UUID
    metric: Literal["heart_rate", "blood_pressure", "body_temperature"]
    unit: str
    measured_at: datetime = Field(json_schema_extra={"format": "date-time"})
    source: RecordSource
    quality: RecordQuality
    is_synthetic: Literal[True]
    created_at: datetime = Field(json_schema_extra={"format": "date-time"})

    @field_serializer("measured_at", "created_at")
    def serialize_utc(self, value: datetime) -> str:
        if value.tzinfo is None or value.utcoffset() is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat(timespec="auto").replace("+00:00", "Z")


class HeartRateResponse(ObservationBase):
    metric: Literal["heart_rate"]
    value: float = Field(gt=0, allow_inf_nan=False)
    unit: Literal["bpm"]


class BloodPressureResponse(ObservationBase):
    metric: Literal["blood_pressure"]
    systolic: float = Field(gt=0, allow_inf_nan=False)
    diastolic: float = Field(gt=0, allow_inf_nan=False)
    unit: Literal["mmHg"]


class BodyTemperatureResponse(ObservationBase):
    metric: Literal["body_temperature"]
    value: float = Field(gt=0, allow_inf_nan=False)
    unit: Literal["°C"]


ObservationResponse = Annotated[
    Union[HeartRateResponse, BloodPressureResponse, BodyTemperatureResponse],
    Field(discriminator="metric"),
]


class HeartRateCreateResult(HeartRateResponse):
    replayed: bool


class BloodPressureCreateResult(BloodPressureResponse):
    replayed: bool


class BodyTemperatureCreateResult(BodyTemperatureResponse):
    replayed: bool


ObservationCreateResult = Annotated[
    Union[HeartRateCreateResult, BloodPressureCreateResult, BodyTemperatureCreateResult],
    Field(discriminator="metric"),
]


class ObservationCollection(StrictSchema):
    items: list[ObservationResponse]
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)


class SleepCreate(CreateRecordBase):
    duration_minutes: int = Field(gt=0, strict=True)
    reporting_date: date
    includes_naps: bool = Field(strict=True)

    @field_validator("reporting_date", mode="before")
    @classmethod
    def require_calendar_date(cls, value: object) -> object:
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError("must be a YYYY-MM-DD calendar date")
        return value


class SleepResponse(StrictSchema):
    id: uuid.UUID
    profile_id: uuid.UUID
    client_record_id: uuid.UUID
    duration_minutes: int = Field(gt=0)
    reporting_date: date
    includes_naps: bool
    source: Literal["manual", "simulated_device"]
    quality: Literal["valid", "suspect", "invalid"]
    is_synthetic: Literal[True]
    created_at: datetime = Field(json_schema_extra={"format": "date-time"})

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        if value.tzinfo is None or value.utcoffset() is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat(timespec="auto").replace("+00:00", "Z")


class SleepCreateResult(SleepResponse):
    replayed: bool


class SleepCollection(StrictSchema):
    items: list[SleepResponse]
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
