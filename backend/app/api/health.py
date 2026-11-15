from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.schemas.health import HealthResponse, ReadinessResponse

health_router = APIRouter(tags=["health"])
REQUEST_ID_HEADER = {
    "X-Request-ID": {
        "description": "UUID used to correlate this request.",
        "schema": {"type": "string", "format": "uuid"},
    },
}


def _problem_response_documentation(description: str) -> dict[str, object]:
    return {
        "description": description,
        "headers": REQUEST_ID_HEADER,
        "content": {
            "application/problem+json": {
                "schema": {"$ref": "#/components/schemas/ProblemDetails"},
            },
        },
    }


@health_router.get(
    "/health",
    response_model=HealthResponse,
    operation_id="healthCheck",
    responses={
        200: {"headers": REQUEST_ID_HEADER},
        500: _problem_response_documentation("Unexpected server error"),
    },
)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")


@health_router.get(
    "/ready",
    response_model=ReadinessResponse,
    operation_id="readinessCheck",
    responses={
        200: {"headers": REQUEST_ID_HEADER},
        500: _problem_response_documentation("Unexpected server error"),
        503: _problem_response_documentation("Database is unavailable"),
    },
)
def readiness_check(
    session: Session = Depends(get_session),
) -> ReadinessResponse:
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503) from error
    return ReadinessResponse(status="ready", database="available")
