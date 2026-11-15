from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.base import Base
from app.main import create_app


@pytest.fixture
def api(tmp_path: Path):
    settings = Settings(
        app_environment="test",
        database_url=f"sqlite:///{(tmp_path / 'auth-api.db').as_posix()}",
        cors_origins=["http://localhost:5173"],
        _env_file=None,
    )
    app = create_app(settings)
    with TestClient(app) as client:
        Base.metadata.create_all(app.state.engine)
        yield client


def register(client: TestClient, email: str, display_name: str) -> TestClient:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "correct-horse-battery-42", "display_name": display_name},
        headers={"Origin": "http://testserver"},
    )
    assert response.status_code == 201
    assert response.json()["user"]["email"] == email.lower()
    assert "astroorbitx_session" in response.cookies
    assert "astroorbitx_csrf" in response.cookies
    return client


def test_private_me_routes_require_authentication(api: TestClient) -> None:
    for path in ("/api/v1/me", "/api/v1/me/profile", "/api/v1/me/measurements"):
        response = api.get(path)
        assert response.status_code == 401
        assert response.headers["content-type"].startswith("application/problem+json")


def test_legacy_synthetic_routes_cannot_disclose_actual_profiles_or_records(api: TestClient) -> None:
    registered = api.post(
        "/api/v1/auth/register",
        json={"email": "private-owner@example.test", "password": "correct-horse-battery-42", "display_name": "Private owner"},
        headers={"Origin": "http://testserver"},
    )
    assert registered.status_code == 201
    profile_id = registered.json()["profile"]["id"]
    api.post(
        "/api/v1/me/measurements",
        headers={"Origin": "http://testserver", "X-CSRF-Token": api.cookies["astroorbitx_csrf"]},
        json={
            "client_record_id": "22222222-2222-4222-8222-222222222222",
            "category": "heart_rate",
            "value": "72",
            "unit": "bpm",
            "measured_at": "2026-11-14T12:30:00Z",
        },
    )
    anonymous = TestClient(api.app)

    assert all(item["id"] != profile_id for item in anonymous.get("/api/v1/profiles").json()["items"])
    assert anonymous.get(f"/api/v1/profiles/{profile_id}").status_code == 404
    assert anonymous.get(f"/api/v1/profiles/{profile_id}/observations").status_code == 404


def test_registration_creates_owner_and_logout_requires_csrf(api: TestClient) -> None:
    register(api, "Owner@Example.test", "Owner")

    assert api.get("/api/v1/me").status_code == 200
    assert api.get("/api/v1/me/profile").json()["display_name"] == "Owner"

    missing_csrf = api.post("/api/v1/auth/logout", headers={"Origin": "http://testserver"})
    assert missing_csrf.status_code == 403

    csrf_token = api.cookies.get("astroorbitx_csrf")
    logout = api.post(
        "/api/v1/auth/logout",
        headers={"Origin": "http://testserver", "X-CSRF-Token": csrf_token or ""},
    )
    assert logout.status_code == 204
    assert api.get("/api/v1/me").status_code == 401


def test_login_rotates_session_and_profile_patch_is_owner_authenticated(api: TestClient) -> None:
    register(api, "Login@Example.test", "Before login")
    old_token = api.cookies["astroorbitx_session"]
    old_csrf = api.cookies["astroorbitx_csrf"]
    stale_session = TestClient(api.app)
    stale_session.cookies.set("astroorbitx_session", old_token)
    stale_session.cookies.set("astroorbitx_csrf", old_csrf)

    bad_credentials = api.post(
        "/api/v1/auth/login",
        json={"email": "login@example.test", "password": "wrong-password"},
        headers={"Origin": "http://testserver"},
    )
    assert bad_credentials.status_code == 401
    assert "login@example.test" not in bad_credentials.text
    assert "wrong-password" not in bad_credentials.text

    login = api.post(
        "/api/v1/auth/login",
        json={"email": " LOGIN@example.test ", "password": "correct-horse-battery-42"},
        headers={"Origin": "http://testserver"},
    )
    assert login.status_code == 200
    assert api.cookies["astroorbitx_session"] != old_token
    assert stale_session.get("/api/v1/me").status_code == 401

    updated = api.patch(
        "/api/v1/me/profile",
        headers={"Origin": "http://testserver", "X-CSRF-Token": api.cookies["astroorbitx_csrf"]},
        json={"display_name": "After login"},
    )
    assert updated.status_code == 200
    assert updated.json()["display_name"] == "After login"


def test_measurement_ids_are_not_authority(api: TestClient) -> None:
    first = TestClient(api.app)
    second = TestClient(api.app)
    register(first, "first@example.test", "First")
    register(second, "second@example.test", "Second")

    created = first.post(
        "/api/v1/me/measurements",
        headers={"Origin": "http://testserver", "X-CSRF-Token": first.cookies["astroorbitx_csrf"]},
        json={
            "client_record_id": "22222222-2222-4222-8222-222222222222",
            "category": "heart_rate",
            "value": "72.50",
            "unit": "bpm",
            "measured_at": "2026-11-14T12:30:00+05:00",
        },
    )
    assert created.status_code == 201
    measurement_id = created.json()["id"]

    assert second.get(f"/api/v1/me/measurements/{measurement_id}").status_code == 404
    assert second.patch(
        f"/api/v1/me/measurements/{measurement_id}",
        headers={"Origin": "http://testserver", "X-CSRF-Token": second.cookies["astroorbitx_csrf"]},
        json={"value": "99", "unit": "bpm"},
    ).status_code == 404
    assert second.get("/api/v1/me/measurements").json()["items"] == []


@pytest.mark.parametrize(
    ("category_fields", "category"),
    [
        ({"value": "72.500", "unit": "bpm"}, "heart_rate"),
        ({"systolic": "120.0", "diastolic": "80.25", "unit": "mmHg"}, "blood_pressure"),
        ({"value": "98.60", "unit": "°F"}, "body_temperature"),
        ({"value": "5.75", "unit": "mmol/L"}, "blood_glucose"),
        ({"value": "7.5", "unit": "h"}, "sleep_duration"),
    ],
)
def test_all_measurement_categories_preserve_values_and_timestamps(api: TestClient, category_fields, category) -> None:
    register(api, f"{category}@example.test", category)
    body = {
        "client_record_id": "22222222-2222-4222-8222-222222222222",
        "category": category,
        "measured_at": "2026-11-14T12:30:00+05:00",
        "time_zone": "Asia/Karachi",
        **category_fields,
    }
    response = api.post(
        "/api/v1/me/measurements",
        headers={"Origin": "http://testserver", "X-CSRF-Token": api.cookies["astroorbitx_csrf"]},
        json=body,
    )

    assert response.status_code == 201
    result = response.json()
    assert result["category"] == category
    assert result["measured_at"] == body["measured_at"]
    assert result["time_zone"] == "Asia/Karachi"
    assert result["source"] == "manual"
    assert result["is_synthetic"] is False
    assert {key: result[key] for key in category_fields} == category_fields
    if category == "blood_pressure":
        assert "value" not in result


@pytest.mark.parametrize(
    "body",
    [
        {"category": "heart_rate", "value": "0", "unit": "bpm"},
        {"category": "heart_rate", "value": "72", "unit": "beats/min"},
        {"category": "blood_pressure", "systolic": "120", "unit": "mmHg"},
        {"category": "sleep_duration", "value": "7", "unit": "minutes"},
        {"category": "blood_glucose", "value": "NaN", "unit": "mg/dL"},
    ],
)
def test_invalid_measurement_payloads_are_sanitized(api: TestClient, body) -> None:
    register(api, "validation@example.test", "Validation")
    payload = {
        "client_record_id": "22222222-2222-4222-8222-222222222222",
        "measured_at": "2026-11-14T12:30:00+00:00",
        **body,
    }
    response = api.post(
        "/api/v1/me/measurements",
        headers={"Origin": "http://testserver", "X-CSRF-Token": api.cookies["astroorbitx_csrf"]},
        json=payload,
    )
    assert response.status_code == 422
    assert "validation@example.test" not in response.text
    assert "NaN" not in response.text


def test_measurement_filters_correction_and_owner_fields(api: TestClient) -> None:
    register(api, "correction@example.test", "Correction")
    headers = {"Origin": "http://testserver", "X-CSRF-Token": api.cookies["astroorbitx_csrf"]}
    created = api.post(
        "/api/v1/me/measurements",
        headers=headers,
        json={
            "client_record_id": "22222222-2222-4222-8222-222222222222",
            "category": "blood_pressure",
            "systolic": "120.5",
            "diastolic": "80",
            "unit": "mmHg",
            "measured_at": "2026-11-14T12:30:00+05:00",
        },
    )
    measurement_id = created.json()["id"]
    assert api.get("/api/v1/me/measurements?category=heart_rate").json()["items"] == []
    assert api.get("/api/v1/me/measurements?from=2026-11-14T00:00:00Z&to=2026-11-15T00:00:00Z").json()["items"][0]["id"] == measurement_id

    incomplete_pair = api.patch(
        f"/api/v1/me/measurements/{measurement_id}",
        headers=headers,
        json={"systolic": "121", "unit": "mmHg"},
    )
    assert incomplete_pair.status_code == 422
    corrected = api.patch(
        f"/api/v1/me/measurements/{measurement_id}",
        headers=headers,
        json={"systolic": "121.25", "diastolic": "81", "unit": "mmHg"},
    )
    assert corrected.status_code == 200
    assert corrected.json()["systolic"] == "121.25"
    assert corrected.json()["diastolic"] == "81"
    assert api.delete(f"/api/v1/me/measurements/{measurement_id}").status_code == 405

    owner_field = api.post(
        "/api/v1/me/measurements",
        headers=headers,
        json={
            "client_record_id": "33333333-3333-4333-8333-333333333333",
            "category": "heart_rate",
            "value": "70",
            "unit": "bpm",
            "measured_at": "2026-11-14T12:30:00Z",
            "user_id": "ffffffff-ffff-4fff-8fff-ffffffffffff",
        },
    )
    assert owner_field.status_code == 422


def test_trends_group_owner_records_by_utc_day_with_empty_gaps(api: TestClient) -> None:
    register(api, "trend-owner@example.test", "Trend owner")
    headers = {"Origin": "http://testserver", "X-CSRF-Token": api.cookies["astroorbitx_csrf"]}
    for record_id, value, measured_at in [
        ("11111111-1111-4111-8111-111111111111", "70", "2026-11-14T23:30:00-02:00"),
        ("22222222-2222-4222-8222-222222222222", "74", "2026-11-17T08:00:00Z"),
    ]:
        response = api.post(
            "/api/v1/me/measurements",
            headers=headers,
            json={
                "client_record_id": record_id,
                "category": "heart_rate",
                "value": value,
                "unit": "bpm",
                "measured_at": measured_at,
            },
        )
        assert response.status_code == 201

    result = api.get("/api/v1/me/trends?category=heart_rate&from=2026-11-15&to=2026-11-17")
    assert result.status_code == 200
    body = result.json()
    assert body["from"] == "2026-11-15"
    assert body["to"] == "2026-11-17"
    assert len(body["series"]) == 1
    days = body["series"][0]["days"]
    assert [(day["date"], day["count"], day["mean"]) for day in days] == [
        ("2026-11-15", 1, "70"),
        ("2026-11-16", 0, None),
        ("2026-11-17", 1, "74"),
    ]
    too_wide = api.get("/api/v1/me/trends?category=heart_rate&from=2026-11-01&to=2026-12-02")
    assert too_wide.status_code == 422


def test_cors_preflight_options_for_allowed_origin(api: TestClient) -> None:
    response = api.options(
        "/api/v1/auth/register",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-request-id",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.headers["access-control-allow-credentials"] == "true"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_cors_preflight_options_for_unauthorized_origin(api: TestClient) -> None:
    response = api.options(
        "/api/v1/auth/register",
        headers={
            "Origin": "https://unauthorized.evil.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_cors_preflight_and_registration_for_deployed_netlify_origin(api: TestClient) -> None:
    client = TestClient(api.app, base_url="https://testserver")
    preflight = client.options(
        "/api/v1/auth/register",
        headers={
            "Origin": "https://astroorbitx.netlify.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-request-id,x-csrf-token",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == "https://astroorbitx.netlify.app"
    assert preflight.headers["access-control-allow-credentials"] == "true"

    register_res = client.post(
        "/api/v1/auth/register",
        json={"email": "netlify-user@example.test", "password": "secure-password-123", "display_name": "Netlify Astronaut"},
        headers={"Origin": "https://astroorbitx.netlify.app"},
    )
    assert register_res.status_code == 201
    assert "x-csrf-token" in register_res.headers
    csrf_token = register_res.headers["x-csrf-token"]
    assert csrf_token

    # Verify mutating route works with the csrf token header and session cookie over HTTPS
    patch_res = client.patch(
        "/api/v1/me/profile",
        json={"display_name": "Updated Astronaut"},
        headers={"Origin": "https://astroorbitx.netlify.app", "X-CSRF-Token": csrf_token},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["display_name"] == "Updated Astronaut"


def test_unhandled_exception_retains_cors_headers_for_allowed_origin(api: TestClient) -> None:
    from sqlalchemy.exc import OperationalError
    from unittest.mock import patch

    client = TestClient(api.app, base_url="https://testserver")

    with patch("app.api.auth.utc_now", side_effect=RuntimeError("unexpected crash")):
        res = client.post(
            "/api/v1/auth/register",
            json={"email": "crash@example.test", "password": "secure-password-123", "display_name": "Crasher"},
            headers={"Origin": "https://astroorbitx.netlify.app"},
        )
        assert res.status_code == 500
        assert res.headers["access-control-allow-origin"] == "https://astroorbitx.netlify.app"
        assert res.headers["access-control-allow-credentials"] == "true"


def test_registration_database_failure_returns_503_with_cors_headers(api: TestClient) -> None:
    from sqlalchemy.exc import OperationalError
    from unittest.mock import patch

    client = TestClient(api.app, base_url="https://testserver")

    with patch("sqlalchemy.orm.Session.flush", side_effect=OperationalError("connection lost", None, None)):
        res = client.post(
            "/api/v1/auth/register",
            json={"email": "dbfail@example.test", "password": "secure-password-123", "display_name": "DB Fail"},
            headers={"Origin": "https://astroorbitx.netlify.app"},
        )
        assert res.status_code == 503
        assert res.headers["access-control-allow-origin"] == "https://astroorbitx.netlify.app"
        assert res.headers["access-control-allow-credentials"] == "true"
        data = res.json()
        assert data["status"] == 503
        assert data["title"] == "Service Unavailable"

