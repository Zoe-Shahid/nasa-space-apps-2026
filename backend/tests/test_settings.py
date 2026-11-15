from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_DATABASE_PATH, NETLIFY_ORIGIN, Settings


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
    assert "https://frontend.example" in settings.effective_cors_origins
    assert NETLIFY_ORIGIN in settings.effective_cors_origins
    assert settings.log_level == "DEBUG"


def test_default_settings_allow_only_frontend_development_origins() -> None:
    settings = Settings(_env_file=None)

    assert NETLIFY_ORIGIN in settings.effective_cors_origins
    assert "http://localhost:5173" in settings.effective_cors_origins
    assert "http://127.0.0.1:5173" in settings.effective_cors_origins
    assert settings.openapi_enabled


def test_production_settings_disable_openapi() -> None:
    settings = Settings(app_environment="production", _env_file=None)

    assert not settings.openapi_enabled
    # Netlify origin must always be allowed, even in production
    assert NETLIFY_ORIGIN in settings.effective_cors_origins


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


def test_database_url_translates_postgres_scheme() -> None:
    settings = Settings(
        database_url="postgres://user:pass@ep-xyz.aws.neon.tech/db?sslmode=require",
        _env_file=None,
    )
    assert settings.database_url.startswith("postgresql://")


def test_database_url_neon_auto_appends_sslmode() -> None:
    settings = Settings(
        database_url="postgres://user:pass@ep-xyz.aws.neon.tech/db",
        _env_file=None,
    )
    assert settings.database_url == "postgresql://user:pass@ep-xyz.aws.neon.tech/db?sslmode=require"


def test_standard_database_url_env_var_supported(monkeypatch) -> None:
    monkeypatch.delenv("ASTROORBITX_DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@ep-xyz.aws.neon.tech/render_db")
    settings = Settings(_env_file=None)
    assert "render_db" in settings.database_url
    assert settings.database_url.startswith("postgresql://")
    assert "sslmode=require" in settings.database_url


def test_database_url_strips_quotes_and_whitespace() -> None:
    settings = Settings(
        database_url='  "postgres://user:pass@ep-xyz.aws.neon.tech/db"  ',
        _env_file=None,
    )
    assert settings.database_url == "postgresql://user:pass@ep-xyz.aws.neon.tech/db?sslmode=require"


def test_database_url_rejects_placeholder_host() -> None:
    with pytest.raises(ValueError, match="placeholder hostname"):
        Settings(
            database_url="postgres://user:pass@YOUR_NEON_HOST/db",
            _env_file=None,
        )


def test_cors_origins_flexible_parsing() -> None:
    from_str = Settings(cors_origins="https://astroorbitx.netlify.app", _env_file=None)
    assert from_str.cors_origins == ["https://astroorbitx.netlify.app"]

    from_csv = Settings(
        cors_origins="https://astroorbitx.netlify.app, http://localhost:5173",
        _env_file=None,
    )
    assert from_csv.cors_origins == ["https://astroorbitx.netlify.app", "http://localhost:5173"]

    from_json = Settings(
        cors_origins='["https://astroorbitx.netlify.app"]',
        _env_file=None,
    )
    assert from_json.cors_origins == ["https://astroorbitx.netlify.app"]
