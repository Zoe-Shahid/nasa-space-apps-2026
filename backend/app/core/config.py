from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

BACKEND_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = BACKEND_ROOT / "data" / "astroorbitx.db"
DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


class Settings(BaseSettings):
    app_environment: Literal["development", "test", "production"] = "development"
    database_url: str = f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
    cors_origins: list[str] | None = None
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    model_config = SettingsConfigDict(
        env_prefix="ASTROORBITX_",
        env_file=BACKEND_ROOT / ".env",
        extra="ignore",
        validate_default=True,
        hide_input_in_errors=True,
    )

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        try:
            parsed_url = make_url(value)
        except (ArgumentError, TypeError, ValueError) as error:
            raise ValueError("must be a valid SQLAlchemy database URL") from error
        if not parsed_url.drivername:
            raise ValueError("must include a database driver")
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
            return self.cors_origins
        if self.app_environment == "production":
            return []
        return DEFAULT_CORS_ORIGINS.copy()

    @property
    def openapi_enabled(self) -> bool:
        return self.app_environment != "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
