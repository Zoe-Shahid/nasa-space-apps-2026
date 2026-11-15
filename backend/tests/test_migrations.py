import uuid
from datetime import date, datetime, timezone
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError, StatementError

from app.core.config import Settings
from app.db.session import build_engine, build_session_factory
from app.models.profiles import Profile, SleepRecord, VitalObservation

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def test_initial_migration_upgrade_and_downgrade(tmp_path: Path) -> None:
    database_path = tmp_path / "migration-test.db"
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_path.as_posix()}")

    command.upgrade(config, "head")
    settings = Settings(
        app_environment="test",
        database_url=f"sqlite:///{database_path.as_posix()}",
        _env_file=None,
    )
    engine = build_engine(settings)
    try:
        inspector = inspect(engine)
        assert "alembic_version" in inspector.get_table_names()
        assert "domain_catalog" in inspector.get_table_names()
        assert {"users", "user_sessions", "profiles", "vital_observations", "sleep_records"} <= set(
            inspector.get_table_names()
        )
        assert {
            index["name"] for index in inspect(engine).get_indexes("profiles")
        } >= {"ix_profiles_created_id"}
        assert {
            index["name"] for index in inspect(engine).get_indexes("vital_observations")
        } >= {"ix_vital_profile_created_id", "ix_vital_profile_measured_id", "ix_vital_profile_metric_measured"}
        assert {
            index["name"] for index in inspect(engine).get_indexes("sleep_records")
        } >= {"ix_sleep_profile_created_id", "ix_sleep_profile_measured_id"}
        assert {
            constraint["name"] for constraint in inspector.get_unique_constraints("vital_observations")
        } >= {"uq_vital_profile_client_record"}
        assert {
            constraint["name"] for constraint in inspector.get_unique_constraints("sleep_records")
        } >= {"uq_sleep_profile_client_record"}
        assert {
            constraint["name"] for constraint in inspector.get_check_constraints("profiles")
        } >= {"ck_profiles_display_name_length", "ck_profiles_owner_mode"}
        assert {
            constraint["name"] for constraint in inspector.get_check_constraints("vital_observations")
        } >= {
            "ck_vital_observations_metric_value_shape",
            "ck_vital_observations_positive_finite_values",
            "ck_vital_observations_source_enum",
            "ck_vital_observations_quality_enum",
        }
        assert {
            constraint["name"] for constraint in inspector.get_check_constraints("sleep_records")
        } >= {
            "ck_sleep_records_positive_duration",
            "ck_sleep_records_positive_duration_value",
            "ck_sleep_records_duration_unit",
            "ck_sleep_records_source_enum",
            "ck_sleep_records_quality_enum",
        }
        assert {constraint["name"] for constraint in inspector.get_unique_constraints("profiles")} >= {
            "uq_profiles_user_id",
            "uq_profiles_id_synthetic",
        }
        assert inspector.get_foreign_keys("profiles")[0]["referred_table"] == "users"
        assert inspector.get_foreign_keys("vital_observations")[0]["constrained_columns"] == [
            "profile_id",
            "is_synthetic",
        ]
        with engine.connect() as connection:
            assert connection.execute(text("SELECT COUNT(*) FROM domain_catalog")).scalar_one() == 0
            assert connection.execute(text("SELECT COUNT(*) FROM users")).scalar_one() == 0
            assert connection.execute(text("SELECT COUNT(*) FROM user_sessions")).scalar_one() == 0
            assert connection.execute(text("SELECT COUNT(*) FROM profiles")).scalar_one() == 0
            assert connection.execute(text("SELECT COUNT(*) FROM vital_observations")).scalar_one() == 0
            assert connection.execute(text("SELECT COUNT(*) FROM sleep_records")).scalar_one() == 0
        profile_id = uuid.uuid4()
        factory = build_session_factory(engine)
        with factory.begin() as session:
            session.add(Profile(id=profile_id, display_name="Synthetic profile"))
        with pytest.raises(IntegrityError):
            with factory.begin() as session:
                session.add(Profile(id=uuid.uuid4(), display_name="Not synthetic", is_synthetic=False))
        with pytest.raises((IntegrityError, StatementError)):
            with factory.begin() as session:
                session.add(
                    VitalObservation(
                        profile_id=profile_id,
                        client_record_id=uuid.uuid4(),
                        metric="heart_rate",
                        value=0,
                        unit="bpm",
                        measured_at=datetime.now(timezone.utc),
                        source="manual",
                        quality="valid",
                        is_synthetic=True,
                    )
                )
        with pytest.raises(IntegrityError):
            with factory.begin() as session:
                session.add(
                    SleepRecord(
                        profile_id=profile_id,
                        client_record_id=uuid.uuid4(),
                        duration_minutes=0,
                        reporting_date=date.today(),
                        includes_naps=False,
                        source="manual",
                        quality="valid",
                        is_synthetic=True,
                    )
                )
        client_record_id = uuid.uuid4()
        with factory.begin() as session:
            session.add(
                VitalObservation(
                    profile_id=profile_id,
                    client_record_id=client_record_id,
                    metric="heart_rate",
                    value=72,
                    unit="bpm",
                    measured_at=datetime.now(timezone.utc),
                    source="manual",
                    quality="valid",
                    is_synthetic=True,
                )
            )
        with pytest.raises(IntegrityError):
            with factory.begin() as session:
                session.add(
                    VitalObservation(
                        profile_id=profile_id,
                        client_record_id=client_record_id,
                        metric="heart_rate",
                        value=73,
                        unit="bpm",
                        measured_at=datetime.now(timezone.utc),
                        source="manual",
                        quality="valid",
                        is_synthetic=True,
                    )
                )
        with pytest.raises(IntegrityError):
            with factory.begin() as session:
                session.add(
                    VitalObservation(
                        profile_id=uuid.uuid4(),
                        client_record_id=uuid.uuid4(),
                        metric="heart_rate",
                        value=72,
                        unit="bpm",
                        measured_at=datetime.now(timezone.utc),
                        source="manual",
                        quality="valid",
                        is_synthetic=True,
                    )
                )
        with pytest.raises(IntegrityError):
            with engine.begin() as connection:
                connection.execute(
                    text("INSERT INTO domain_catalog (domain_id) VALUES ('unknown_domain')"),
                )
        command.downgrade(config, "base")
        with engine.connect() as connection:
            remaining_revisions = connection.execute(text("SELECT version_num FROM alembic_version")).all()
        assert remaining_revisions == []
        assert "domain_catalog" not in inspect(engine).get_table_names()
        assert "profiles" not in inspect(engine).get_table_names()
    finally:
        engine.dispose()
