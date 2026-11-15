from fastapi import APIRouter

from app.api.auth import auth_router, me_router
from app.api.health import health_router
from app.api.measurements import measurements_router, trends_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(me_router)
api_router.include_router(measurements_router)
api_router.include_router(trends_router)
