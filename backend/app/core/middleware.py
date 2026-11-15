import logging
import time
from uuid import UUID, uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger("astroorbitx.api")


def problem_response(
    *,
    status_code: int,
    title: str,
    detail: str,
    request_id: str,
    errors: list[dict[str, str]] | None = None,
) -> JSONResponse:
    body: dict[str, object] = {
        "type": "about:blank",
        "title": title,
        "status": status_code,
        "detail": detail,
        "request_id": request_id,
    }
    if errors is not None:
        body["errors"] = errors
    return JSONResponse(
        body,
        status_code=status_code,
        media_type="application/problem+json",
        headers={"X-Request-ID": request_id},
    )


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        candidate = headers.get("x-request-id", "")
        try:
            request_id = str(UUID(candidate))
        except ValueError:
            request_id = str(uuid4())
        scope.setdefault("state", {})["request_id"] = request_id
        started_at = time.perf_counter()
        response_started = False

        async def send_with_context(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
                MutableHeaders(scope=message)["X-Request-ID"] = request_id
                route = scope.get("route")
                logger.info(
                    "request",
                    extra={
                        "event": "http_request",
                        "request_id": request_id,
                        "method": scope.get("method"),
                        "route": getattr(route, "path", "<unmatched>"),
                        "status_code": message["status"],
                        "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
                    },
                )
            await send(message)

        try:
            await self.app(scope, receive, send_with_context)
        except Exception:
            if response_started:
                raise
            logger.error(
                "unhandled request failure",
                exc_info=True,
                extra={
                    "event": "unhandled_request_failure",
                    "request_id": request_id,
                    "method": scope.get("method"),
                    "route": getattr(scope.get("route"), "path", "<unmatched>"),
                    "status_code": 500,
                    "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
                },
            )
            response = problem_response(
                status_code=500,
                title="Internal Server Error",
                detail="An unexpected server error occurred.",
                request_id=request_id,
            )
            await response(scope, receive, send_with_context)
