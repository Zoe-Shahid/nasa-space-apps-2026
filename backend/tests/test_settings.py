from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_DATABASE_PATH, Settings


def test_default_database_url_uses_backend_data_directory() -> None:
    settings = Settings(_env_file=None)

    assert settings.database_url == f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
    assert DEFAULT_DATABASE_PATH.parent.name == "data"


def test_database_url_can_be_overridden_by_environment(monkeypatch, tmp_path: Path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'configured.db').as_posix()}"
    monkeypatch.setenv("ASTROORBITX_DATABASE_URL", database_url)

    assert Settings(_env_file=None).database_url == database_url


def test_application_settings_can_be_overridden_by_environment(monkeypatch) -> None:
    monkeypatch.setenv("ASTROORBITX_APP_ENVIRONMENT", "test")
    monkeypatch.setenv("ASTROORBITX_CORS_ORIGINS", '["https://frontend.example"]')
    monkeypatch.setenv("ASTROORBITX_LOG_LEVEL", "DEBUG")

    settings = Settings(_env_file=None)

    assert settings.app_environment == "test"
    assert settings.effective_cors_origins == ["https://frontend.example"]
    assert settings.log_level == "DEBUG"


def test_default_settings_allow_only_frontend_development_origins() -> None:
    settings = Settings(_env_file=None)

    assert settings.effective_cors_origins == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    assert settings.openapi_enabled


def test_production_settings_disable_openapi() -> None:
    settings = Settings(app_environment="production", _env_file=None)

    assert not settings.openapi_enabled
    assert settings.effective_cors_origins == []


@pytest.mark.parametrize(
    "origins",
    [
        ["*"],
        ["http://localhost:5173/path"],
        ["javascript://invalid"],
        ["http://user:password@localhost:5173"],
        ["http://localhost:invalid-port"],
    ],
)
def test_cors_origins_must_be_explicit_origins(origins: list[str]) -> None:
    with pytest.raises(ValidationError):
        Settings(cors_origins=origins, _env_file=None)


def test_invalid_database_url_is_rejected() -> None:
    secret_url = "not a database URL containing private-password"
    with pytest.raises(ValidationError) as error:
        Settings(database_url=secret_url, _env_file=None)
    assert "private-password" not in str(error.value)
