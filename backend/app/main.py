from contextlib import asynccontextmanager
from http import HTTPStatus
import logging
from typing import Any, AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.profiles import product_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware, problem_response
from app.db.session import build_engine, build_session_factory, upgrade_database
from app.schemas.errors import ProblemDetails

logger = logging.getLogger("astroorbitx.api")


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unavailable")


async def _http_exception_handler(
    request: Request,
    error: StarletteHTTPException,
) -> JSONResponse:
    try:
        title = HTTPStatus(error.status_code).phrase
    except ValueError:
        title = "Request Failed"
    detail = "The request could not be completed."
    if error.status_code == 503:
        detail = "The service is temporarily unavailable."
    return problem_response(
        status_code=error.status_code,
        title=title,
        detail=detail,
        request_id=_request_id(request),
    )


async def _validation_exception_handler(
    request: Request,
    error: RequestValidationError,
) -> JSONResponse:
    field_errors = []
    for item in error.errors():
        location = ".".join(str(part) for part in item["loc"])
        code = str(item["type"])
        message = "Field is required." if code == "missing" else "Invalid value."
        field_errors.append({"field": location, "code": code, "message": message})
    return problem_response(
        status_code=422,
        title="Unprocessable Entity",
        detail="Request validation failed.",
        request_id=_request_id(request),
        errors=field_errors,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging(app_settings.log_level)
        app_engine = build_engine(app_settings)
        app.state.engine = app_engine
        app.state.session_factory = build_session_factory(app_engine)
        try:
            upgrade_database(app_engine, app_settings)
        except Exception as error:
            logger.error("Failed to run database migrations on startup: %s", error, exc_info=True)
            try:
                from app.db.base import Base
                import app.models.domain  # noqa: F401
                import app.models.profiles  # noqa: F401
                import app.models.users  # noqa: F401
                Base.metadata.create_all(bind=app_engine)
            except Exception as create_err:
                logger.error("Failed to auto-create database tables fallback: %s", create_err, exc_info=True)
        try:
            yield
        finally:
            app_engine.dispose()

    docs_enabled = app_settings.openapi_enabled
    app = FastAPI(
        title="AstroOrbitX API",
        version="0.1.0",
        description="Authenticated local health-measurement MVP with owner-scoped records and operational endpoints.",
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
        lifespan=lifespan,
    )
    app.state.settings = app_settings
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.effective_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Accept", "Content-Type", "X-Request-ID", "X-CSRF-Token"],
        expose_headers=["X-Request-ID", "X-CSRF-Token"],
    )
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.include_router(api_router)
    if app_settings.app_environment != "production":
        app.include_router(product_router, prefix="/api/v1")

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema is not None:
            return app.openapi_schema
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        problem_schema = ProblemDetails.model_json_schema(
            ref_template="#/components/schemas/{model}",
        )
        definitions = problem_schema.pop("$defs", {})
        components = schema.setdefault("components", {}).setdefault("schemas", {})
        components.update(definitions)
        components["ProblemDetails"] = problem_schema
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi
    return app


app = create_app()
