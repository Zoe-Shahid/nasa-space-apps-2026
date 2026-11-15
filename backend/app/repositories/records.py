import uuid

from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.profiles import Profile, SleepRecord, VitalObservation


def profile_exists(session: Session, profile_id: uuid.UUID) -> bool:
    return session.scalar(
        select(Profile.id).where(Profile.id == profile_id, Profile.is_synthetic.is_(True))
    ) is not None


def get_observation(
    session: Session,
    profile_id: uuid.UUID,
    client_record_id: uuid.UUID,
) -> VitalObservation | None:
    return session.scalar(
        select(VitalObservation).where(
            VitalObservation.profile_id == profile_id,
            VitalObservation.client_record_id == client_record_id,
        )
    )


def list_observations(
    session: Session,
    profile_id: uuid.UUID,
    *,
    limit: int,
    offset: int,
) -> list[VitalObservation]:
    return list(
        session.scalars(
            select(VitalObservation)
            .where(VitalObservation.profile_id == profile_id)
            .order_by(desc(VitalObservation.created_at), desc(VitalObservation.id))
            .limit(limit)
            .offset(offset)
        ).all()
    )


def insert_observation(
    session: Session,
    values: dict[str, object],
) -> tuple[VitalObservation, bool]:
    record = VitalObservation(**values)
    try:
        with session.begin_nested():
            session.add(record)
            session.flush()
        return record, False
    except IntegrityError:
        existing = get_observation(session, record.profile_id, record.client_record_id)
        if existing is None:
            raise
        return existing, True


def get_sleep_record(
    session: Session,
    profile_id: uuid.UUID,
    client_record_id: uuid.UUID,
) -> SleepRecord | None:
    return session.scalar(
        select(SleepRecord).where(
            SleepRecord.profile_id == profile_id,
            SleepRecord.client_record_id == client_record_id,
        )
    )


def list_sleep_records(
    session: Session,
    profile_id: uuid.UUID,
    *,
    limit: int,
    offset: int,
) -> list[SleepRecord]:
    return list(
        session.scalars(
            select(SleepRecord)
            .where(SleepRecord.profile_id == profile_id)
            .order_by(desc(SleepRecord.created_at), desc(SleepRecord.id))
            .limit(limit)
            .offset(offset)
        ).all()
    )


def insert_sleep_record(
    session: Session,
    values: dict[str, object],
) -> tuple[SleepRecord, bool]:
    record = SleepRecord(**values)
    try:
        with session.begin_nested():
            session.add(record)
            session.flush()
        return record, False
    except IntegrityError:
        existing = get_sleep_record(session, record.profile_id, record.client_record_id)
        if existing is None:
            raise
        return existing, True
