from datetime import date, datetime
from typing import Literal
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.security import Principal, get_principal, require_csrf
from app.db.session import get_session
from app.schemas.measurements import (
    MeasurementCollection,
    MeasurementCreate,
    MeasurementPatch,
    MeasurementResponse,
    MeasurementTrends,
    RFC3339_PATTERN,
)
from app.services.measurements import (
    MeasurementConflict,
    MeasurementNotFound,
    create_measurement,
    get_measurement,
    get_trends,
    list_measurements,
    patch_measurement,
)

measurements_router = APIRouter(prefix="/me/measurements", tags=["measurements"])
trends_router = APIRouter(prefix="/me/trends", tags=["trends"])


def _parse_instant(value: str | None) -> datetime | None:
    if value is None:
        return None
    if not RFC3339_PATTERN.fullmatch(value):
        raise HTTPException(status_code=422)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise HTTPException(status_code=422) from error
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise HTTPException(status_code=422)
    return parsed


@measurements_router.post(
    "",
    response_model=MeasurementResponse,
    response_model_exclude_none=True,
    status_code=201,
    operation_id="createMyMeasurement",
)
def post_measurement(
    payload: MeasurementCreate,
    request: Request,
    response: Response,
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> MeasurementResponse:
    require_csrf(request, principal)
    try:
        result, replayed = create_measurement(session, principal.user.id, payload)
        session.commit()
    except MeasurementConflict as error:
        session.rollback()
        raise HTTPException(status_code=409) from error
    except MeasurementNotFound as error:
        session.rollback()
        raise HTTPException(status_code=404) from error
    if replayed:
        response.status_code = 200
    return MeasurementResponse.model_validate(result)


@measurements_router.get(
    "",
    response_model=MeasurementCollection,
    response_model_exclude_none=True,
    operation_id="listMyMeasurements",
)
def get_measurements(
    category: Literal["heart_rate", "blood_pressure", "body_temperature", "blood_glucose", "sleep_duration"] | None = None,
    from_value: str | None = Query(default=None, alias="from"),
    to_value: str | None = Query(default=None, alias="to"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> MeasurementCollection:
    start = _parse_instant(from_value)
    end = _parse_instant(to_value)
    if start is not None and end is not None and start >= end:
        raise HTTPException(status_code=422)
    items = list_measurements(
        session,
        principal.user.id,
        category=category,
        start=start,
        end=end,
        limit=limit,
        offset=offset,
    )
    return MeasurementCollection(items=[MeasurementResponse.model_validate(item) for item in items], limit=limit, offset=offset)


@measurements_router.get(
    "/{measurement_id}",
    response_model=MeasurementResponse,
    response_model_exclude_none=True,
    operation_id="getMyMeasurement",
)
def get_my_measurement(
    measurement_id: uuid.UUID,
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> MeasurementResponse:
    try:
        return MeasurementResponse.model_validate(get_measurement(session, principal.user.id, measurement_id))
    except MeasurementNotFound as error:
        raise HTTPException(status_code=404) from error


@measurements_router.patch(
    "/{measurement_id}",
    response_model=MeasurementResponse,
    response_model_exclude_none=True,
    operation_id="patchMyMeasurement",
)
def patch_my_measurement(
    measurement_id: uuid.UUID,
    payload: MeasurementPatch,
    request: Request,
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> MeasurementResponse:
    require_csrf(request, principal)
    try:
        result = patch_measurement(session, principal.user.id, measurement_id, payload)
        session.commit()
        return MeasurementResponse.model_validate(result)
    except MeasurementNotFound as error:
        session.rollback()
        raise HTTPException(status_code=404) from error
    except (ValueError, ValidationError) as error:
        session.rollback()
        raise HTTPException(status_code=422) from error


@trends_router.get("", response_model=MeasurementTrends, operation_id="getMyMeasurementTrends")
def get_my_trends(
    category: Literal["heart_rate", "blood_pressure", "body_temperature", "blood_glucose", "sleep_duration"],
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> MeasurementTrends:
    if from_date > to_date or (to_date - from_date).days >= 31:
        raise HTTPException(status_code=422)
    try:
        return MeasurementTrends.model_validate(
            get_trends(session, principal.user.id, category, from_date, to_date)
        )
    except MeasurementNotFound as error:
        raise HTTPException(status_code=404) from error