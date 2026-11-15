from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

BACKEND_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = BACKEND_ROOT / "data" / "astroorbitx.db"
DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Deployed frontend origin — always allowed so CORS works in production
# without requiring ASTROORBITX_CORS_ORIGINS to be set explicitly.
NETLIFY_ORIGIN = "https://astroorbitx.netlify.app"


class Settings(BaseSettings):
    app_environment: Literal["development", "test", "production"] = Field(
        default="development",
        validation_alias=AliasChoices("ASTROORBITX_APP_ENVIRONMENT", "APP_ENVIRONMENT", "app_environment"),
    )
    database_url: str = Field(
        default=f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}",
        validation_alias=AliasChoices("ASTROORBITX_DATABASE_URL", "DATABASE_URL", "database_url"),
    )
    cors_origins: list[str] | None = Field(
        default=None,
        validation_alias=AliasChoices("ASTROORBITX_CORS_ORIGINS", "CORS_ORIGINS", "cors_origins"),
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        validation_alias=AliasChoices("ASTROORBITX_LOG_LEVEL", "LOG_LEVEL", "log_level"),
    )

    model_config = SettingsConfigDict(
        env_prefix="ASTROORBITX_",
        env_file=BACKEND_ROOT / ".env",
        extra="ignore",
        validate_default=True,
        hide_input_in_errors=True,
        populate_by_name=True,
    )

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            value = "postgresql://" + value[len("postgres://"):]
        try:
            parts = urlsplit(value)
        except Exception:
            parts = None
        if parts and parts.hostname and ("neon.tech" in parts.hostname):
            query_params = parse_qs(parts.query, keep_blank_values=True)
            if "sslmode" not in query_params:
                query_params["sslmode"] = ["require"]
                new_query = urlencode(query_params, doseq=True)
                value = urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))
        try:
            parsed_url = make_url(value)
        except (ArgumentError, TypeError, ValueError) as error:
            raise ValueError("must be a valid SQLAlchemy database URL") from error
        if not parsed_url.drivername:
            raise ValueError("must include a database driver")
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            if value.startswith("[") and value.endswith("]"):
                try:
                    import json
                    return json.loads(value)
                except Exception:
                    pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, origins: list[str] | None) -> list[str] | None:
        if origins is None:
            return None
        normalized: list[str] = []
        for origin in origins:
            try:
                parsed = urlsplit(origin)
                _ = parsed.port
            except ValueError as error:
                raise ValueError("CORS origins must be valid HTTP(S) origins") from error
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or parsed.username is not None
                or parsed.password is not None
                or parsed.path
                or parsed.query
                or parsed.fragment
                or any(character.isspace() for character in origin)
            ):
                raise ValueError("CORS origins must be explicit HTTP(S) origins without paths")
            normalized.append(origin)
        return normalized

    @property
    def effective_cors_origins(self) -> list[str]:
        if self.cors_origins is not None:
            # Explicit env var always wins — merge with deployed frontend origin
            origins = list(self.cors_origins)
            if NETLIFY_ORIGIN not in origins:
                origins.append(NETLIFY_ORIGIN)
            return origins
        # Always include the deployed Netlify frontend plus local dev origins
        return [NETLIFY_ORIGIN] + DEFAULT_CORS_ORIGINS.copy()

    @property
    def openapi_enabled(self) -> bool:
        return self.app_environment != "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
