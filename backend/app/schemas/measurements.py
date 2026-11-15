import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Annotated, Literal, Union
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator
from uuid import UUID

RFC3339_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)
DECIMAL_PATTERN = re.compile(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$")


def _positive_decimal_string(value: object) -> str:
    if not isinstance(value, str) or len(value) > 64 or not DECIMAL_PATTERN.fullmatch(value):
        raise ValueError("must be a positive finite decimal string")
    try:
        number = Decimal(value)
    except InvalidOperation as error:
        raise ValueError("must be a positive finite decimal string") from error
    if not number.is_finite() or number <= 0:
        raise ValueError("must be a positive finite decimal string")
    return value


PositiveDecimalString = Annotated[str, BeforeValidator(_positive_decimal_string)]


class MeasurementCreateBase(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    client_record_id: UUID = Field(strict=False)
    measured_at: str
    time_zone: str | None = None
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("measured_at")
    @classmethod
    def require_offset_timestamp(cls, value: str) -> str:
        if not RFC3339_PATTERN.fullmatch(value):
            raise ValueError("must be an RFC 3339 timestamp with an explicit UTC offset")
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError("must be a valid RFC 3339 timestamp") from error
        return value

    @field_validator("time_zone")
    @classmethod
    def require_iana_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            ZoneInfo(value)
        except (ValueError, ZoneInfoNotFoundError) as error:
            raise ValueError("must be a valid IANA timezone") from error
        return value


class HeartRateMeasurementCreate(MeasurementCreateBase):
    category: Literal["heart_rate"]
    value: PositiveDecimalString
    unit: Literal["bpm"]


class BloodPressureMeasurementCreate(MeasurementCreateBase):
    category: Literal["blood_pressure"]
    systolic: PositiveDecimalString
    diastolic: PositiveDecimalString
    unit: Literal["mmHg"]


class BodyTemperatureMeasurementCreate(MeasurementCreateBase):
    category: Literal["body_temperature"]
    value: PositiveDecimalString
    unit: Literal["°C", "°F"]


class BloodGlucoseMeasurementCreate(MeasurementCreateBase):
    category: Literal["blood_glucose"]
    value: PositiveDecimalString
    unit: Literal["mg/dL", "mmol/L"]


class SleepDurationMeasurementCreate(MeasurementCreateBase):
    category: Literal["sleep_duration"]
    value: PositiveDecimalString
    unit: Literal["h", "min"]


MeasurementCreate = Annotated[
    Union[
        HeartRateMeasurementCreate,
        BloodPressureMeasurementCreate,
        BodyTemperatureMeasurementCreate,
        BloodGlucoseMeasurementCreate,
        SleepDurationMeasurementCreate,
    ],
    Field(discriminator="category"),
]


class MeasurementPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    value: PositiveDecimalString | None = None
    systolic: PositiveDecimalString | None = None
    diastolic: PositiveDecimalString | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=8)
    measured_at: str | None = None
    time_zone: str | None = None
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("measured_at")
    @classmethod
    def require_offset_timestamp(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return MeasurementCreateBase.require_offset_timestamp(value)

    @field_validator("time_zone")
    @classmethod
    def require_iana_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return MeasurementCreateBase.require_iana_timezone(value)


class MeasurementResponse(BaseModel):
    id: UUID
    category: str
    value: str | None = None
    systolic: str | None = None
    diastolic: str | None = None
    unit: str
    measured_at: str
    time_zone: str | None = None
    source: str
    note: str | None = None
    is_synthetic: bool
    created_at: datetime
    updated_at: datetime


class MeasurementCollection(BaseModel):
    items: list[MeasurementResponse]
    limit: int
    offset: int


class TrendDay(BaseModel):
    date: str
    count: int
    min: str | None
    max: str | None
    mean: str | None


class TrendSeries(BaseModel):
    category: str
    unit: str
    field: str | None = None
    days: list[TrendDay]


class MeasurementTrends(BaseModel):
    from_date: str = Field(alias="from")
    to_date: str = Field(alias="to")
    series: list[TrendSeries]

    model_config = ConfigDict(populate_by_name=True)