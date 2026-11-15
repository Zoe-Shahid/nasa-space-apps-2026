import json
import logging
import os
from pathlib import Path

from fastapi.testclient import TestClient
from uvicorn import Config

from app.core.config import Settings
from app.core.logging import StructuredLogFormatter, configure_logging
from app.main import create_app


def build_test_app(tmp_path: Path):
    settings = Settings(
        app_environment="test",
        database_url=f"sqlite:///{(tmp_path / 'api-test.db').as_posix()}",
        cors_origins=["http://localhost:5173"],
        _env_file=None,
    )
    return create_app(settings)


def test_app_startup_health_readiness_and_cors(tmp_path: Path) -> None:
    app = build_test_app(tmp_path)
    with TestClient(app) as client:
        assert app.state.engine is not None
        assert app.state.session_factory is not None
        assert os.stat(tmp_path / "api-test.db").st_mode & 0o077 == 0

        health = client.get(
            "/api/v1/health",
            headers={"X-Request-ID": "4f5c2f80-8750-42bd-a695-fefaf89b246f"},
        )
        readiness = client.get("/api/v1/ready")
        preflight = client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": "x-request-id,x-csrf-token",
            },
        )
        disallowed_preflight = client.options(
            "/api/v1/health",
            headers={
                "Origin": "https://unapproved.example",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert health.headers["X-Request-ID"] == "4f5c2f80-8750-42bd-a695-fefaf89b246f"
    assert readiness.status_code == 200
    assert readiness.json() == {"status": "ready", "database": "available"}
    assert preflight.status_code == 200
    assert preflight.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert preflight.headers["Access-Control-Allow-Credentials"] == "true"
    assert "Access-Control-Allow-Origin" not in disallowed_preflight.headers


def test_invalid_request_id_is_replaced(tmp_path: Path) -> None:
    app = build_test_app(tmp_path)
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/health",
            headers={"X-Request-ID": "invalid request id"},
        )

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] != "invalid request id"
    assert " " not in response.headers["X-Request-ID"]


def test_openapi_contains_operational_and_approved_prototype_routes(tmp_path: Path) -> None:
    app = build_test_app(tmp_path)
    schema = app.openapi()

    assert set(schema["paths"]) == {
        "/api/v1/health",
        "/api/v1/ready",
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/auth/logout",
        "/api/v1/me",
        "/api/v1/me/profile",
        "/api/v1/me/measurements",
        "/api/v1/me/measurements/{measurement_id}",
        "/api/v1/me/trends",
        "/api/v1/profiles",
        "/api/v1/profiles/{profile_id}",
        "/api/v1/profiles/{profile_id}/observations",
        "/api/v1/profiles/{profile_id}/sleep-records",
    }
    assert schema["paths"]["/api/v1/health"]["get"]["operationId"] == "healthCheck"
    assert schema["paths"]["/api/v1/ready"]["get"]["operationId"] == "readinessCheck"
    health_response = schema["paths"]["/api/v1/health"]["get"]["responses"]["200"]
    assert "X-Request-ID" in health_response["headers"]
    assert "HealthResponse" in schema["components"]["schemas"]
    assert "ReadinessResponse" in schema["components"]["schemas"]
    readiness_error = schema["paths"]["/api/v1/ready"]["get"]["responses"]["503"]
    assert "ProblemDetails" in schema["components"]["schemas"]
    assert set(readiness_error["content"]) == {"application/problem+json"}
    assert "500" in schema["paths"]["/api/v1/health"]["get"]["responses"]


def test_production_disables_openapi_routes(tmp_path: Path) -> None:
    settings = Settings(
        app_environment="production",
        database_url=f"sqlite:///{(tmp_path / 'production.db').as_posix()}",
        _env_file=None,
    )
    app = create_app(settings)

    assert app.openapi_url is None
    assert app.docs_url is None
    assert app.redoc_url is None

    product_requests = [
        ("GET", "/api/v1/profiles"),
        ("GET", "/api/v1/profiles/11111111-1111-4111-8111-111111111111"),
        ("POST", "/api/v1/profiles/11111111-1111-4111-8111-111111111111/observations"),
        ("GET", "/api/v1/profiles/11111111-1111-4111-8111-111111111111/observations"),
        ("POST", "/api/v1/profiles/11111111-1111-4111-8111-111111111111/sleep-records"),
        ("GET", "/api/v1/profiles/11111111-1111-4111-8111-111111111111/sleep-records"),
    ]
    with TestClient(app) as client:
        for method, path in product_requests:
            response = client.request(method, path, json={} if method == "POST" else None)
            assert response.status_code == 404
            assert response.headers["content-type"].startswith("application/problem+json")
            assert response.headers["X-Request-ID"] == response.json()["request_id"]
        assert client.get("/openapi.json").status_code == 404
        assert client.get("/api/v1/health").status_code == 200
        assert client.post(
            "/api/v1/auth/register",
            json={"email": "production@example.test", "password": "correct-horse-battery-42", "display_name": "Test"},
            headers={"Origin": "http://testserver"},
        ).status_code == 201


def test_uvicorn_default_host_is_loopback() -> None:
    assert Config("app.main:app").host == "127.0.0.1"


def test_validation_error_uses_sanitized_problem_response(tmp_path: Path) -> None:
    app = build_test_app(tmp_path)

    def validation_probe(value: int) -> int:
        return value

    app.add_api_route("/api/v1/_test-validation", validation_probe, methods=["GET"])
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/_test-validation",
            params={"value": "private-value"},
        )

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.headers["X-Request-ID"] == response.json()["request_id"]
    assert response.json()["type"] == "about:blank"
    assert response.json()["errors"][0]["field"] == "query.value"
    assert "private-value" not in response.text


def test_unhandled_error_is_sanitized_and_correlated(tmp_path: Path) -> None:
    app = build_test_app(tmp_path)

    def failing_probe() -> None:
        raise RuntimeError("private note must not leak")

    app.add_api_route("/api/v1/_test-failure", failing_probe, methods=["GET"])
    with TestClient(app) as client:
        response = client.get("/api/v1/_test-failure")

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.headers["X-Request-ID"] == response.json()["request_id"]
    assert "private note must not leak" not in response.text


def test_structured_log_formatter_omits_unapproved_record_fields() -> None:
    record = logging.LogRecord(
        name="astroorbitx.api",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="sensitive request content",
        args=(),
        exc_info=None,
    )
    record.event = "http_request"
    record.request_id = "request-1"
    record.private_note = "must not appear"
    formatted = StructuredLogFormatter().format(record)
    payload = json.loads(formatted)

    assert set(payload) == {"timestamp", "level", "event", "request_id"}
    assert payload["level"] == "INFO"
    assert payload["event"] == "http_request"
    assert payload["request_id"] == "request-1"
    assert "sensitive request content" not in formatted
    assert "must not appear" not in formatted


def test_configure_logging_disables_unstructured_uvicorn_access_log() -> None:
    configure_logging("INFO")

    assert logging.getLogger("uvicorn.access").disabled
