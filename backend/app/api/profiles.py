import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.schemas.errors import ProblemDetails
from app.schemas.profiles import (
    ObservationCollection,
    ObservationCreate,
    ObservationCreateResult,
    PaginationQuery,
    ProfileCollection,
    ProfileResponse,
    SleepCollection,
    SleepCreate,
    SleepCreateResult,
)
from app.services.profiles import ProfileNotFound, get_profile, list_profiles
from app.services.records import (
    IdempotencyConflict,
    create_observation,
    create_sleep_record,
    list_observations,
    list_sleep_records,
)

product_router = APIRouter(tags=["synthetic-local-data"])

REQUEST_ID_HEADER = {
    "X-Request-ID": {
        "description": "UUID used to correlate this request.",
        "schema": {"type": "string", "format": "uuid"},
    }
}


def _problem_response(description: str) -> dict[str, object]:
    return {
        "description": description,
        "content": {
            "application/problem+json": {
                "schema": {"$ref": "#/components/schemas/ProblemDetails"},
            },
        },
        "headers": REQUEST_ID_HEADER,
    }


def _created_response(description: str) -> dict[str, object]:
    return {"description": description, "headers": REQUEST_ID_HEADER}


def _pagination(limit: int, offset: int) -> PaginationQuery:
    return PaginationQuery(limit=limit, offset=offset)


@product_router.get(
    "/profiles",
    response_model=ProfileCollection,
    operation_id="listProfiles",
    summary="List synthetic profiles",
    responses={
        200: _created_response("Synthetic profiles ordered by creation time and ID."),
        422: _problem_response("Invalid pagination values."),
        500: _problem_response("Unexpected server failure."),
    },
)
def list_profiles_route(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> ProfileCollection:
    return list_profiles(session, _pagination(limit, offset))


@product_router.get(
    "/profiles/{profile_id}",
    response_model=ProfileResponse,
    operation_id="getProfile",
    summary="Read a synthetic profile",
    responses={
        200: _created_response("Synthetic profile."),
        404: _problem_response("Profile does not exist."),
        422: _problem_response("Invalid profile UUID."),
        500: _problem_response("Unexpected server failure."),
    },
)
def get_profile_route(profile_id: uuid.UUID, session: Session = Depends(get_session)) -> ProfileResponse:
    try:
        return get_profile(session, profile_id)
    except ProfileNotFound as error:
        raise HTTPException(status_code=404) from error


@product_router.post(
    "/profiles/{profile_id}/observations",
    response_model=ObservationCreateResult,
    status_code=201,
    operation_id="createObservation",
    summary="Create a synthetic vital observation",
    responses={
        200: {
            "model": ObservationCreateResult,
            "description": "Identical idempotent retry; original record returned.",
            "headers": REQUEST_ID_HEADER,
        },
        201: _created_response("Observation created."),
        404: _problem_response("Profile does not exist."),
        409: _problem_response("Idempotency key was reused with a different payload."),
        422: _problem_response("Invalid path or request body."),
        500: _problem_response("Unexpected server failure."),
    },
)
def post_observation(
    profile_id: uuid.UUID,
    payload: ObservationCreate,
    response: Response,
    session: Session = Depends(get_session),
) -> ObservationCreateResult:
    try:
        with session.begin():
            result = create_observation(session, profile_id, payload)
    except ProfileNotFound as error:
        raise HTTPException(status_code=404) from error
    except IdempotencyConflict as error:
        raise HTTPException(status_code=409) from error
    if result.replayed:
        response.status_code = 200
    return result


@product_router.get(
    "/profiles/{profile_id}/observations",
    response_model=ObservationCollection,
    operation_id="listObservations",
    summary="List synthetic vital observations",
    responses={
        200: _created_response("Vital observations ordered by creation time and ID."),
        404: _problem_response("Profile does not exist."),
        422: _problem_response("Invalid profile UUID or pagination values."),
        500: _problem_response("Unexpected server failure."),
    },
)
def list_observations_route(
    profile_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> ObservationCollection:
    try:
        return list_observations(session, profile_id, _pagination(limit, offset))
    except ProfileNotFound as error:
        raise HTTPException(status_code=404) from error


@product_router.post(
    "/profiles/{profile_id}/sleep-records",
    response_model=SleepCreateResult,
    status_code=201,
    operation_id="createSleepRecord",
    summary="Create a synthetic sleep-duration record",
    responses={
        200: {
            "model": SleepCreateResult,
            "description": "Identical idempotent retry; original record returned.",
            "headers": REQUEST_ID_HEADER,
        },
        201: _created_response("Sleep-duration record created."),
        404: _problem_response("Profile does not exist."),
        409: _problem_response("Idempotency key was reused with a different payload."),
        422: _problem_response("Invalid path or request body."),
        500: _problem_response("Unexpected server failure."),
    },
)
def post_sleep_record(
    profile_id: uuid.UUID,
    payload: SleepCreate,
    response: Response,
    session: Session = Depends(get_session),
) -> SleepCreateResult:
    try:
        with session.begin():
            result = create_sleep_record(session, profile_id, payload)
    except ProfileNotFound as error:
        raise HTTPException(status_code=404) from error
    except IdempotencyConflict as error:
        raise HTTPException(status_code=409) from error
    if result.replayed:
        response.status_code = 200
    return result


@product_router.get(
    "/profiles/{profile_id}/sleep-records",
    response_model=SleepCollection,
    operation_id="listSleepRecords",
    summary="List synthetic sleep-duration records",
    responses={
        200: _created_response("Sleep-duration records ordered by creation time and ID."),
        404: _problem_response("Profile does not exist."),
        422: _problem_response("Invalid profile UUID or pagination values."),
        500: _problem_response("Unexpected server failure."),
    },
)
def list_sleep_records_route(
    profile_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> SleepCollection:
    try:
        return list_sleep_records(session, profile_id, _pagination(limit, offset))
    except ProfileNotFound as error:
        raise HTTPException(status_code=404) from error
