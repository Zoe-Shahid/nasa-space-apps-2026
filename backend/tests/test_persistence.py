import uuid
from collections.abc import Iterator
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError, StatementError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_engine, build_session_factory
from app.models.profiles import Profile, SleepRecord, VitalObservation
from app.schemas.profiles import HeartRateCreate, SleepCreate
from app.services.records import create_observation, create_sleep_record


PROFILE_ID = uuid.UUID("11111111-1111-4111-8111-111111111111")
CLIENT_RECORD_ID = uuid.UUID("22222222-2222-4222-8222-222222222222")


@pytest.fixture
def persistence(tmp_path: Path) -> Iterator[tuple[Engine, sessionmaker[Session]]]:
    settings = Settings(
        app_environment="test",
        database_url=f"sqlite:///{(tmp_path / 'persistence.db').as_posix()}",
        _env_file=None,
    )
    engine = build_engine(settings)
    Base.metadata.create_all(engine)
    factory = build_session_factory(engine)
    with factory.begin() as session:
        session.add(Profile(id=PROFILE_ID, display_name="Synthetic profile"))
    yield engine, factory
    engine.dispose()


def _observation(
    *,
    profile_id: uuid.UUID = PROFILE_ID,
    client_record_id: uuid.UUID = CLIENT_RECORD_ID,
    measured_at: datetime | None = None,
    value: float | None = 72.5,
    metric: str = "heart_rate",
    unit: str = "bpm",
    source: str = "manual",
    quality: str = "valid",
    is_synthetic: bool = True,
) -> VitalObservation:
    return VitalObservation(
        profile_id=profile_id,
        client_record_id=client_record_id,
        metric=metric,
        value=value,
        unit=unit,
        measured_at=measured_at or datetime(2026, 11, 14, 7, 30, tzinfo=timezone.utc),
        source=source,
        quality=quality,
        is_synthetic=is_synthetic,
    )


def test_utc_timestamps_remain_aware_after_database_round_trip(persistence) -> None:
    _, factory = persistence
    input_instant = datetime(2026, 11, 14, 12, 30, tzinfo=timezone(timedelta(hours=5)))
    with factory.begin() as session:
        observation = _observation(measured_at=input_instant)
        sleep = SleepRecord(
            profile_id=PROFILE_ID,
            client_record_id=uuid.uuid4(),
            duration_minutes=420,
            reporting_date=date(2026, 11, 14),
            includes_naps=False,
            source="manual",
            quality="valid",
            is_synthetic=True,
        )
        session.add_all([observation, sleep])
        session.flush()
        observation_id, sleep_id = observation.id, sleep.id

    with factory() as session:
        stored_observation = session.get(VitalObservation, observation_id)
        stored_sleep = session.get(SleepRecord, sleep_id)
        stored_profile = session.get(Profile, PROFILE_ID)

    assert stored_observation is not None
    assert stored_sleep is not None
    assert stored_profile is not None
    for timestamp in (
        stored_observation.measured_at,
        stored_observation.created_at,
        stored_sleep.created_at,
        stored_profile.created_at,
    ):
        assert timestamp.tzinfo is not None
        assert timestamp.utcoffset() == timedelta(0)
    assert stored_observation.measured_at == datetime(2026, 11, 14, 7, 30, tzinfo=timezone.utc)


def test_database_constraints_enforce_synthetic_and_record_shapes(persistence) -> None:
    _, factory = persistence

    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(Profile(display_name="Not synthetic", is_synthetic=False))

    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(_observation(is_synthetic=False))

    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(_observation(metric="blood_pressure", unit="mmHg"))

    with pytest.raises((IntegrityError, StatementError)):
        with factory.begin() as session:
            session.add(_observation(value=float("inf")))

    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(_observation(source="imported"))

    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(_observation(quality="unknown"))

    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(
                SleepRecord(
                    profile_id=PROFILE_ID,
                    client_record_id=uuid.uuid4(),
                    duration_minutes=0,
                    reporting_date=date(2026, 11, 14),
                    includes_naps=False,
                    source="manual",
                    quality="valid",
                    is_synthetic=True,
                )
            )

    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(_observation(profile_id=uuid.uuid4()))


def test_unique_idempotency_key_is_profile_and_resource_scoped(persistence) -> None:
    _, factory = persistence
    second_profile_id = uuid.UUID("33333333-3333-4333-8333-333333333333")
    with factory.begin() as session:
        session.add(Profile(id=second_profile_id, display_name="Second synthetic profile"))
    with factory.begin() as session:
        session.add(_observation())
        session.add(
            SleepRecord(
                profile_id=PROFILE_ID,
                client_record_id=CLIENT_RECORD_ID,
                duration_minutes=420,
                reporting_date=date(2026, 11, 14),
                includes_naps=False,
                source="manual",
                quality="valid",
                is_synthetic=True,
            )
        )
        session.add(
            _observation(
                profile_id=second_profile_id,
            )
        )

    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(_observation())


def test_naive_timestamp_is_rejected_at_persistence_boundary(persistence) -> None:
    _, factory = persistence
    with pytest.raises(StatementError, match="explicit UTC offset"):
        with factory.begin() as session:
            session.add(_observation(measured_at=datetime(2026, 11, 14, 7, 30)))
            session.flush()


def test_repository_does_not_commit_and_idempotency_scope_is_exact(persistence) -> None:
    _, factory = persistence
    second_profile_id = uuid.UUID("33333333-3333-4333-8333-333333333333")
    observation_payload = HeartRateCreate(
        client_record_id=CLIENT_RECORD_ID,
        metric="heart_rate",
        value=72.5,
        unit="bpm",
        measured_at="2026-11-14T12:30:00+05:00",
        source="manual",
        quality="valid",
    )
    equivalent_payload = HeartRateCreate(
        client_record_id=CLIENT_RECORD_ID,
        metric="heart_rate",
        value=72.5,
        unit="bpm",
        measured_at="2026-11-14T07:30:00Z",
        source="manual",
        quality="valid",
    )
    sleep_payload = SleepCreate(
        client_record_id=CLIENT_RECORD_ID,
        duration_minutes=420,
        reporting_date="2026-11-14",
        includes_naps=False,
        source="manual",
        quality="valid",
    )

    with factory.begin() as session:
        session.add(Profile(id=second_profile_id, display_name="Second synthetic profile"))

    with pytest.raises(RuntimeError, match="rollback caller transaction"):
        with factory.begin() as session:
            first = create_observation(session, PROFILE_ID, observation_payload)
            same_instant = create_observation(session, PROFILE_ID, equivalent_payload)
            other_profile = create_observation(
                session, second_profile_id, observation_payload
            )
            other_resource = create_sleep_record(
                session, PROFILE_ID, sleep_payload
            )
            assert first.replayed is False
            assert same_instant.replayed is True
            assert same_instant.id == first.id
            assert other_profile.replayed is False
            assert other_profile.profile_id == second_profile_id
            assert other_resource.replayed is False
            assert other_resource.profile_id == PROFILE_ID
            raise RuntimeError("rollback caller transaction")

    with factory() as session:
        assert session.scalar(select(VitalObservation.id)) is None
        assert session.scalar(select(SleepRecord.id)) is None
