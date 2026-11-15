import uuid

import pytest

from app.cli import provision_profile
from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_engine, build_session_factory
from app.models.profiles import Profile, SleepRecord, VitalObservation


def test_explicit_profile_provisioning_creates_only_profile(tmp_path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'provision.db').as_posix()}"
    settings = Settings(app_environment="development", database_url=database_url, _env_file=None)
    engine = build_engine(settings)
    Base.metadata.create_all(engine)
    engine.dispose()

    profile_id = uuid.uuid4()
    assert provision_profile(settings, "  Synthetic user  ", profile_id) == profile_id
    verify_engine = build_engine(settings)
    try:
        with build_session_factory(verify_engine)() as session:
            profile = session.get(Profile, profile_id)
            assert profile is not None
            assert profile.display_name == "Synthetic user"
            assert profile.is_synthetic is True
            assert session.query(VitalObservation).count() == 0
            assert session.query(SleepRecord).count() == 0
    finally:
        verify_engine.dispose()


def test_profile_provisioning_without_id_is_deterministic(tmp_path) -> None:
    first_settings = Settings(
        app_environment="development",
        database_url=f"sqlite:///{(tmp_path / 'first-provision.db').as_posix()}",
        _env_file=None,
    )
    second_settings = Settings(
        app_environment="development",
        database_url=f"sqlite:///{(tmp_path / 'second-provision.db').as_posix()}",
        _env_file=None,
    )
    for settings in (first_settings, second_settings):
        engine = build_engine(settings)
        Base.metadata.create_all(engine)
        engine.dispose()

    first_id = provision_profile(first_settings, "Synthetic profile")
    second_id = provision_profile(second_settings, "Synthetic profile")

    assert first_id == second_id
    assert first_id == uuid.uuid5(uuid.NAMESPACE_URL, "astroorbitx:synthetic-profile:Synthetic profile")


def test_profile_provisioning_rejects_production_and_invalid_names(tmp_path) -> None:
    production = Settings(
        app_environment="production",
        database_url=f"sqlite:///{(tmp_path / 'production.db').as_posix()}",
        _env_file=None,
    )
    with pytest.raises(ValueError, match="disabled in production"):
        provision_profile(production, "Synthetic user")

    development = Settings(
        app_environment="development",
        database_url=f"sqlite:///{(tmp_path / 'invalid.db').as_posix()}",
        _env_file=None,
    )
    with pytest.raises(ValueError, match="1 to 120"):
        provision_profile(development, "  ")


def test_provision_user_creates_account_and_profile(tmp_path) -> None:
    from app.cli import provision_user
    from app.models.users import User

    database_url = f"sqlite:///{(tmp_path / 'user-provision.db').as_posix()}"
    settings = Settings(app_environment="development", database_url=database_url, _env_file=None)
    engine = build_engine(settings)
    Base.metadata.create_all(engine)
    engine.dispose()

    user_id = provision_user(settings, "provisioned@example.test", "correct-horse-battery-42", "Provisioned Name")
    assert user_id is not None

    verify_engine = build_engine(settings)
    try:
        with build_session_factory(verify_engine)() as session:
            user = session.get(User, user_id)
            assert user is not None
            assert user.email == "provisioned@example.test"
            profile = session.query(Profile).filter_by(user_id=user_id).one()
            assert profile.display_name == "Provisioned Name"
            assert profile.is_synthetic is False
    finally:
        verify_engine.dispose()
