from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.profiles import Profile, SleepRecord, VitalObservation
from app.schemas.measurements import MeasurementCreate, MeasurementPatch

MEASUREMENT_ADAPTER = TypeAdapter(MeasurementCreate)


class MeasurementNotFound(Exception):
    pass


class MeasurementConflict(Exception):
    pass


def _owned_profile(session: Session, user_id: uuid.UUID) -> Profile:
    profile = session.scalar(
        select(Profile).where(
            Profile.user_id == user_id,
            Profile.is_synthetic.is_(False),
        )
    )
    if profile is None:
        raise MeasurementNotFound
    return profile


def _utc_instant(timestamp: str) -> datetime:
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00")).astimezone(timezone.utc)


def _response(record: VitalObservation | SleepRecord) -> dict[str, Any]:
    is_sleep = isinstance(record, SleepRecord)
    category = "sleep_duration" if is_sleep else record.metric
    measured_at = record.measured_at
    measured_at_input = record.measured_at_input
    return {
        "id": record.id,
        "category": category,
        "value": record.duration_value if is_sleep else record.value,
        "systolic": None if is_sleep else record.systolic,
        "diastolic": None if is_sleep else record.diastolic,
        "unit": record.unit,
        "measured_at": measured_at_input or measured_at.isoformat().replace("+00:00", "Z"),
        "time_zone": record.time_zone,
        "source": record.source,
        "note": record.note,
        "is_synthetic": record.is_synthetic,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def _record_data(payload: MeasurementCreate) -> dict[str, Any]:
    return payload.model_dump()


def _find_by_client_id(
    session: Session,
    user_id: uuid.UUID,
    client_record_id: uuid.UUID,
) -> VitalObservation | SleepRecord | None:
    vital = session.scalar(
        select(VitalObservation)
        .join(Profile, Profile.id == VitalObservation.profile_id)
        .where(
            Profile.user_id == user_id,
            Profile.is_synthetic.is_(False),
            VitalObservation.client_record_id == client_record_id,
        )
    )
    if vital is not None:
        return vital
    return session.scalar(
        select(SleepRecord)
        .join(Profile, Profile.id == SleepRecord.profile_id)
        .where(
            Profile.user_id == user_id,
            Profile.is_synthetic.is_(False),
            SleepRecord.client_record_id == client_record_id,
        )
    )


def create_measurement(
    session: Session,
    user_id: uuid.UUID,
    payload: MeasurementCreate,
) -> tuple[dict[str, Any], bool]:
    profile = _owned_profile(session, user_id)
    client_record_id = payload.client_record_id
    existing = _find_by_client_id(session, user_id, client_record_id)
    data = _record_data(payload)
    if existing is not None:
        existing_data = {
            "category": "sleep_duration" if isinstance(existing, SleepRecord) else existing.metric,
            "value": existing.duration_value if isinstance(existing, SleepRecord) else existing.value,
            "systolic": None if isinstance(existing, SleepRecord) else existing.systolic,
            "diastolic": None if isinstance(existing, SleepRecord) else existing.diastolic,
            "unit": existing.unit,
            "measured_at": existing.measured_at_input,
            "time_zone": existing.time_zone,
            "note": existing.note,
        }
        if existing_data != {key: data.get(key) for key in existing_data}:
            raise MeasurementConflict
        return _response(existing), True

    now = datetime.now(timezone.utc)
    measured_at = _utc_instant(payload.measured_at)
    if payload.category == "sleep_duration":
        record: VitalObservation | SleepRecord = SleepRecord(
            id=uuid.uuid4(),
            profile_id=profile.id,
            client_record_id=client_record_id,
            duration_value=payload.value,
            unit=payload.unit,
            measured_at=measured_at,
            measured_at_input=payload.measured_at,
            time_zone=payload.time_zone,
            source="manual",
            is_synthetic=False,
            note=payload.note,
            created_at=now,
            updated_at=now,
        )
    else:
        record = VitalObservation(
            id=uuid.uuid4(),
            profile_id=profile.id,
            client_record_id=client_record_id,
            metric=payload.category,
            value=getattr(payload, "value", None),
            systolic=getattr(payload, "systolic", None),
            diastolic=getattr(payload, "diastolic", None),
            unit=payload.unit,
            measured_at=measured_at,
            measured_at_input=payload.measured_at,
            time_zone=payload.time_zone,
            source="manual",
            quality=None,
            is_synthetic=False,
            note=payload.note,
            created_at=now,
            updated_at=now,
        )
    session.add(record)
    session.flush()
    return _response(record), False


def _owner_record(session: Session, user_id: uuid.UUID, record_id: uuid.UUID) -> VitalObservation | SleepRecord:
    vital = session.scalar(
        select(VitalObservation)
        .join(Profile, Profile.id == VitalObservation.profile_id)
        .where(
            VitalObservation.id == record_id,
            Profile.user_id == user_id,
            Profile.is_synthetic.is_(False),
        )
    )
    if vital is not None:
        return vital
    sleep = session.scalar(
        select(SleepRecord)
        .join(Profile, Profile.id == SleepRecord.profile_id)
        .where(
            SleepRecord.id == record_id,
            Profile.user_id == user_id,
            Profile.is_synthetic.is_(False),
        )
    )
    if sleep is None:
        raise MeasurementNotFound
    return sleep


def get_measurement(session: Session, user_id: uuid.UUID, record_id: uuid.UUID) -> dict[str, Any]:
    return _response(_owner_record(session, user_id, record_id))


def list_measurements(
    session: Session,
    user_id: uuid.UUID,
    *,
    category: str | None,
    start: datetime | None,
    end: datetime | None,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    profile = _owned_profile(session, user_id)
    vital_query = select(VitalObservation).where(
        VitalObservation.profile_id == profile.id,
        VitalObservation.is_synthetic.is_(False),
    )
    sleep_query = select(SleepRecord).where(
        SleepRecord.profile_id == profile.id,
        SleepRecord.is_synthetic.is_(False),
    )
    if category == "sleep_duration":
        vital_query = vital_query.where(False)
    elif category is not None:
        if category not in {"heart_rate", "blood_pressure", "body_temperature", "blood_glucose"}:
            return []
        vital_query = vital_query.where(VitalObservation.metric == category)
        sleep_query = sleep_query.where(False)
    if start is not None:
        vital_query = vital_query.where(VitalObservation.measured_at >= start)
        sleep_query = sleep_query.where(SleepRecord.measured_at >= start)
    if end is not None:
        vital_query = vital_query.where(VitalObservation.measured_at < end)
        sleep_query = sleep_query.where(SleepRecord.measured_at < end)
    records: list[VitalObservation | SleepRecord] = list(session.scalars(vital_query).all())
    records.extend(session.scalars(sleep_query).all())
    records.sort(key=lambda item: (item.measured_at, item.id.hex), reverse=True)
    return [_response(record) for record in records[offset : offset + limit]]


def patch_measurement(
    session: Session,
    user_id: uuid.UUID,
    record_id: uuid.UUID,
    patch: MeasurementPatch,
) -> dict[str, Any]:
    record = _owner_record(session, user_id, record_id)
    if not patch.model_fields_set:
        raise ValidationError.from_exception_data("MeasurementPatch", [])
    current = _response(record)
    category = current["category"]
    if category == "blood_pressure" and ({"systolic", "diastolic"} & patch.model_fields_set) and not {
        "systolic",
        "diastolic",
    }.issubset(patch.model_fields_set):
        raise ValueError("blood pressure values must be corrected as a pair")
    scalar_category = category != "blood_pressure"
    if scalar_category and "value" in patch.model_fields_set and "unit" not in patch.model_fields_set:
        raise ValueError("value and unit must be corrected together")
    if scalar_category and "unit" in patch.model_fields_set and "value" not in patch.model_fields_set:
        raise ValueError("value and unit must be corrected together")
    if category == "blood_pressure" and ({"systolic", "diastolic"} & patch.model_fields_set) and "unit" not in patch.model_fields_set:
        raise ValueError("blood pressure values and unit must be corrected together")
    candidate = {
        "client_record_id": str(record.client_record_id),
        "category": category,
        "measured_at": current["measured_at"],
        "time_zone": current["time_zone"],
        "note": current["note"],
        "unit": current["unit"],
    }
    if category == "blood_pressure":
        candidate.update(systolic=current["systolic"], diastolic=current["diastolic"])
    else:
        candidate["value"] = current["value"]
    candidate.update(patch.model_dump(exclude_unset=True))
    validated = MEASUREMENT_ADAPTER.validate_python(candidate)
    if isinstance(record, SleepRecord):
        record.duration_value = validated.value
    else:
        record.value = getattr(validated, "value", None)
        record.systolic = getattr(validated, "systolic", None)
        record.diastolic = getattr(validated, "diastolic", None)
    record.unit = validated.unit
    record.measured_at_input = validated.measured_at
    record.measured_at = _utc_instant(validated.measured_at)
    record.time_zone = validated.time_zone
    record.note = validated.note
    record.updated_at = datetime.now(timezone.utc)
    session.flush()
    return _response(record)


def get_trends(
    session: Session,
    user_id: uuid.UUID,
    category: str,
    from_date: date,
    to_date: date,
) -> dict[str, Any]:
    profile = _owned_profile(session, user_id)
    groups: dict[tuple[str, str | None, str], dict[date, list[Decimal]]] = {}
    if category == "sleep_duration":
        records = session.scalars(
            select(SleepRecord).where(
                SleepRecord.profile_id == profile.id,
                SleepRecord.is_synthetic.is_(False),
                SleepRecord.measured_at >= datetime.combine(from_date, datetime.min.time(), timezone.utc),
                SleepRecord.measured_at < datetime.combine(to_date + timedelta(days=1), datetime.min.time(), timezone.utc),
            )
        ).all()
        for record in records:
            if record.duration_value is not None and record.measured_at is not None:
                key = (record.unit, None, category)
                groups.setdefault(key, {}).setdefault(record.measured_at.date(), []).append(Decimal(record.duration_value))
    else:
        records = session.scalars(
            select(VitalObservation).where(
                VitalObservation.profile_id == profile.id,
                VitalObservation.is_synthetic.is_(False),
                VitalObservation.metric == category,
                VitalObservation.measured_at >= datetime.combine(from_date, datetime.min.time(), timezone.utc),
                VitalObservation.measured_at < datetime.combine(to_date + timedelta(days=1), datetime.min.time(), timezone.utc),
            )
        ).all()
        for record in records:
            measured_date = record.measured_at.date()
            if category == "blood_pressure":
                for field, raw_value in (("systolic", record.systolic), ("diastolic", record.diastolic)):
                    if raw_value is not None:
                        key = (record.unit, field, category)
                        groups.setdefault(key, {}).setdefault(measured_date, []).append(Decimal(raw_value))
            elif record.value is not None:
                key = (record.unit, None, category)
                groups.setdefault(key, {}).setdefault(measured_date, []).append(Decimal(record.value))

    series = []
    for (unit, field, group_category), grouped_days in sorted(groups.items()):
        days = []
        cursor = from_date
        while cursor <= to_date:
            values = grouped_days.get(cursor, [])
            if values:
                total = sum(values, Decimal(0))
                days.append({
                    "date": cursor.isoformat(),
                    "count": len(values),
                    "min": str(min(values)),
                    "max": str(max(values)),
                    "mean": str(total / len(values)),
                })
            else:
                days.append({"date": cursor.isoformat(), "count": 0, "min": None, "max": None, "mean": None})
            cursor += timedelta(days=1)
        series.append({"category": group_category, "unit": unit, "field": field, "days": days})
    return {"from": from_date.isoformat(), "to": to_date.isoformat(), "series": series}