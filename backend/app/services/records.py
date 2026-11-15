import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.profiles import SleepRecord, VitalObservation
from app.repositories.records import (
    get_observation,
    get_sleep_record,
    insert_observation,
    insert_sleep_record,
    list_observations as repository_list_observations,
    list_sleep_records as repository_list_sleep_records,
    profile_exists,
)
from app.schemas.profiles import (
    BloodPressureCreateResult,
    BloodPressureResponse,
    BodyTemperatureCreateResult,
    BodyTemperatureResponse,
    HeartRateCreateResult,
    HeartRateResponse,
    ObservationCollection,
    ObservationCreate,
    ObservationCreateResult,
    ObservationResponse,
    PaginationQuery,
    SleepCollection,
    SleepCreate,
    SleepCreateResult,
    SleepResponse,
)
from app.services.profiles import ProfileNotFound


class IdempotencyConflict(Exception):
    pass


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _observation_values(payload: ObservationCreate) -> dict[str, object]:
    values = payload.model_dump()
    values.setdefault("value", None)
    values.setdefault("systolic", None)
    values.setdefault("diastolic", None)
    values["measured_at"] = _utc(values["measured_at"])
    return values


def _same_observation(record: VitalObservation, payload: ObservationCreate) -> bool:
    values = _observation_values(payload)
    for field, value in values.items():
        if field == "client_record_id":
            continue
        stored_value = getattr(record, field)
        if field == "measured_at":
            if _utc(stored_value) != value:
                return False
        elif field in {"value", "systolic", "diastolic"}:
            if stored_value is None or value is None:
                if stored_value is not value:
                    return False
            elif Decimal(str(stored_value)) != Decimal(str(value)):
                return False
        elif stored_value != value:
            return False
    return True


def _same_sleep(record: SleepRecord, payload: SleepCreate) -> bool:
    return all(
        getattr(record, field) == value
        for field, value in payload.model_dump().items()
        if field != "client_record_id"
    )


def _observation_fields(record: VitalObservation) -> dict[str, object]:
    return {
        "id": record.id,
        "profile_id": record.profile_id,
        "client_record_id": record.client_record_id,
        "metric": record.metric,
        "unit": record.unit,
        "measured_at": record.measured_at,
        "source": record.source,
        "quality": record.quality,
        "is_synthetic": True,
        "created_at": record.created_at,
    }


def _observation_response(record: VitalObservation) -> ObservationResponse:
    common = _observation_fields(record)
    if record.metric == "blood_pressure":
        return BloodPressureResponse(systolic=record.systolic, diastolic=record.diastolic, **common)
    if record.metric == "heart_rate":
        return HeartRateResponse(value=record.value, **common)
    if record.metric == "body_temperature":
        return BodyTemperatureResponse(value=record.value, **common)
    raise ValueError("stored observation has an unsupported metric")


def _observation_create_result(record: VitalObservation, replayed: bool) -> ObservationCreateResult:
    common = {**_observation_fields(record), "replayed": replayed}
    if record.metric == "blood_pressure":
        return BloodPressureCreateResult(systolic=record.systolic, diastolic=record.diastolic, **common)
    if record.metric == "heart_rate":
        return HeartRateCreateResult(value=record.value, **common)
    if record.metric == "body_temperature":
        return BodyTemperatureCreateResult(value=record.value, **common)
    raise ValueError("stored observation has an unsupported metric")


def _sleep_response(record: SleepRecord) -> SleepResponse:
    return SleepResponse(
        id=record.id,
        profile_id=record.profile_id,
        client_record_id=record.client_record_id,
        duration_minutes=record.duration_minutes,
        reporting_date=record.reporting_date,
        includes_naps=record.includes_naps,
        source=record.source,
        quality=record.quality,
        is_synthetic=True,
        created_at=record.created_at,
    )


def create_observation(
    session: Session,
    profile_id: uuid.UUID,
    payload: ObservationCreate,
) -> ObservationCreateResult:
    if not profile_exists(session, profile_id):
        raise ProfileNotFound

    existing = get_observation(session, profile_id, payload.client_record_id)
    if existing is not None:
        if not _same_observation(existing, payload):
            raise IdempotencyConflict
        return _observation_create_result(existing, replayed=True)

    values = _observation_values(payload)
    values["profile_id"] = profile_id
    record, raced = insert_observation(session, values)
    if raced and not _same_observation(record, payload):
        raise IdempotencyConflict
    return _observation_create_result(record, replayed=raced)


def list_observations(
    session: Session,
    profile_id: uuid.UUID,
    pagination: PaginationQuery,
) -> ObservationCollection:
    if not profile_exists(session, profile_id):
        raise ProfileNotFound
    records = repository_list_observations(
        session,
        profile_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return ObservationCollection(
        items=[_observation_response(record) for record in records],
        limit=pagination.limit,
        offset=pagination.offset,
    )


def create_sleep_record(
    session: Session,
    profile_id: uuid.UUID,
    payload: SleepCreate,
) -> SleepCreateResult:
    if not profile_exists(session, profile_id):
        raise ProfileNotFound

    existing = get_sleep_record(session, profile_id, payload.client_record_id)
    if existing is not None:
        if not _same_sleep(existing, payload):
            raise IdempotencyConflict
        return SleepCreateResult(**_sleep_response(existing).model_dump(), replayed=True)

    values = payload.model_dump()
    values["profile_id"] = profile_id
    if "duration_value" not in values or values["duration_value"] is None:
        values["duration_value"] = str(values["duration_minutes"])
    if "unit" not in values or values["unit"] is None:
        values["unit"] = "min"
    record, raced = insert_sleep_record(session, values)
    if raced and not _same_sleep(record, payload):
        raise IdempotencyConflict
    return SleepCreateResult(**_sleep_response(record).model_dump(), replayed=raced)


def list_sleep_records(
    session: Session,
    profile_id: uuid.UUID,
    pagination: PaginationQuery,
) -> SleepCollection:
    if not profile_exists(session, profile_id):
        raise ProfileNotFound
    records = repository_list_sleep_records(
        session,
        profile_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return SleepCollection(
        items=[_sleep_response(record) for record in records],
        limit=pagination.limit,
        offset=pagination.offset,
    )
