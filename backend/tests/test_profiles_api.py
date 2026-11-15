import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.base import Base
from app.main import create_app
from app.models.profiles import Profile, SleepRecord, VitalObservation

PROFILE_ID = uuid.UUID("11111111-1111-4111-8111-111111111111")
CLIENT_RECORD_ID = "22222222-2222-4222-8222-222222222222"
MEASURED_AT = "2026-11-14T12:30:00+05:00"
PRODUCT_OPERATIONS = {
    ("/api/v1/profiles", "get"): "listProfiles",
    ("/api/v1/profiles/{profile_id}", "get"): "getProfile",
    ("/api/v1/profiles/{profile_id}/observations", "get"): "listObservations",
    ("/api/v1/profiles/{profile_id}/observations", "post"): "createObservation",
    ("/api/v1/profiles/{profile_id}/sleep-records", "get"): "listSleepRecords",
    ("/api/v1/profiles/{profile_id}/sleep-records", "post"): "createSleepRecord",
}


@pytest.fixture
def api(tmp_path: Path):
    settings = Settings(
        app_environment="test",
        database_url=f"sqlite:///{(tmp_path / 'profiles-api.db').as_posix()}",
        _env_file=None,
    )
    app = create_app(settings)
    with TestClient(app) as client:
        Base.metadata.create_all(app.state.engine)
        yield client, app


def provision(client: TestClient, profile_id: uuid.UUID = PROFILE_ID) -> str:
    with client.app.state.session_factory.begin() as session:
        session.add(Profile(id=profile_id, display_name="Synthetic profile"))
    return str(profile_id)


def test_empty_database_has_no_seed_and_lists_empty_collections(api) -> None:
    client, app = api
    with app.state.session_factory() as session:
        assert session.query(Profile).count() == 0
        assert session.query(VitalObservation).count() == 0
        assert session.query(SleepRecord).count() == 0

    profile_list = client.get("/api/v1/profiles")
    assert profile_list.json() == {"items": [], "limit": 20, "offset": 0}
    assert set(profile_list.json()) == {"items", "limit", "offset"}
    profile_id = provision(client)
    observations = client.get(f"/api/v1/profiles/{profile_id}/observations")
    assert observations.json() == {
        "items": [],
        "limit": 20,
        "offset": 0,
    }
    sleep_records = client.get(f"/api/v1/profiles/{profile_id}/sleep-records")
    assert sleep_records.json() == {
        "items": [],
        "limit": 20,
        "offset": 0,
    }
    assert set(observations.json()) == set(sleep_records.json()) == {"items", "limit", "offset"}


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/profiles?limit=101",
        "/api/v1/profiles?offset=-1",
        f"/api/v1/profiles/{PROFILE_ID}/observations?limit=101",
        f"/api/v1/profiles/{PROFILE_ID}/sleep-records?offset=-1",
    ],
)
def test_collection_routes_reject_invalid_pagination(api, path) -> None:
    client, _ = api
    provision(client)
    response = client.get(path)
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


def test_profile_list_detail_and_pagination(api) -> None:
    client, app = api
    earlier = uuid.UUID("33333333-3333-4333-8333-333333333333")
    later = uuid.UUID("44444444-4444-4444-8444-444444444444")
    with app.state.session_factory.begin() as session:
        session.add_all(
            [
                Profile(id=earlier, display_name="Earlier", created_at=datetime(2026, 1, 1, tzinfo=timezone.utc)),
                Profile(id=later, display_name="Later", created_at=datetime(2026, 1, 2, tzinfo=timezone.utc)),
            ]
        )

    assert client.get("/api/v1/profiles?limit=1&offset=0").json() == {
        "items": [{"id": str(later), "display_name": "Later", "is_synthetic": True}],
        "limit": 1,
        "offset": 0,
    }
    assert client.get(f"/api/v1/profiles/{earlier}").json() == {
        "id": str(earlier),
        "display_name": "Earlier",
        "is_synthetic": True,
    }
    assert set(client.get(f"/api/v1/profiles/{earlier}").json()) == {"id", "display_name", "is_synthetic"}
    missing = client.get(f"/api/v1/profiles/{PROFILE_ID}")
    assert missing.status_code == 404
    assert missing.headers["content-type"].startswith("application/problem+json")
    assert missing.json()["status"] == 404
    assert client.get("/api/v1/profiles/not-a-uuid").status_code == 422
    assert client.get("/api/v1/profiles?limit=0").status_code == 422


@pytest.mark.parametrize(
    ("body", "expected_metric", "fields"),
    [
        (
            {
                "client_record_id": CLIENT_RECORD_ID,
                "metric": "heart_rate",
                "value": 72.5,
                "unit": "bpm",
                "measured_at": MEASURED_AT,
                "source": "manual",
                "quality": "valid",
            },
            "heart_rate",
            {"value": 72.5, "unit": "bpm"},
        ),
        (
            {
                "client_record_id": CLIENT_RECORD_ID,
                "metric": "blood_pressure",
                "systolic": 120,
                "diastolic": 80,
                "unit": "mmHg",
                "measured_at": MEASURED_AT,
                "source": "simulated_device",
                "quality": "suspect",
            },
            "blood_pressure",
            {"systolic": 120, "diastolic": 80, "unit": "mmHg"},
        ),
        (
            {
                "client_record_id": CLIENT_RECORD_ID,
                "metric": "body_temperature",
                "value": 37,
                "unit": "°C",
                "measured_at": MEASURED_AT,
                "source": "manual",
                "quality": "invalid",
            },
            "body_temperature",
            {"value": 37, "unit": "°C"},
        ),
    ],
)
def test_create_observations_persists_and_normalizes_utc(api, body, expected_metric, fields) -> None:
    client, _ = api
    profile_id = provision(client)
    response = client.post(f"/api/v1/profiles/{profile_id}/observations", json=body)
    assert response.status_code == 201
    result = response.json()
    assert result["metric"] == expected_metric
    assert result["profile_id"] == profile_id
    assert result["client_record_id"] == CLIENT_RECORD_ID
    assert result["is_synthetic"] is True
    assert result["replayed"] is False
    assert result["measured_at"] == "2026-11-14T07:30:00Z"
    assert result["created_at"].endswith("Z")
    assert {key: result[key] for key in fields} == fields
    expected_keys = {
        "id",
        "profile_id",
        "client_record_id",
        "metric",
        "unit",
        "measured_at",
        "source",
        "quality",
        "is_synthetic",
        "created_at",
        "replayed",
        *fields.keys(),
    }
    assert set(result) == expected_keys
    assert "private-value" not in response.text


def test_observation_retry_returns_original_and_conflict_is_409(api) -> None:
    client, _ = api
    profile_id = provision(client)
    body = {
        "client_record_id": CLIENT_RECORD_ID,
        "metric": "heart_rate",
        "value": 12345.6789,
        "unit": "bpm",
        "measured_at": MEASURED_AT,
        "source": "manual",
        "quality": "valid",
    }
    first = client.post(f"/api/v1/profiles/{profile_id}/observations", json=body)
    retry = client.post(f"/api/v1/profiles/{profile_id}/observations", json=body)
    changed = {**body, "value": 98765.4321}
    conflict = client.post(f"/api/v1/profiles/{profile_id}/observations", json=changed)
    assert first.status_code == 201
    assert retry.status_code == 200
    assert retry.json()["id"] == first.json()["id"]
    assert retry.json()["replayed"] is True
    assert conflict.status_code == 409
    assert conflict.headers["content-type"].startswith("application/problem+json")
    assert conflict.json()["status"] == 409
    assert "12345.6789" not in conflict.text and "98765.4321" not in conflict.text


@pytest.mark.parametrize(
    "patch",
    [
        {"unit": "beats/min"},
        {"quality": "great"},
        {"measured_at": "2026-11-14T12:30:00"},
        {"value": 0},
        {"id": "private-id-value"},
        {"created_at": "private-created-value"},
        {"is_synthetic": False},
        {"profile_id": "private-profile-value"},
    ],
)
def test_observation_validation_is_sanitized_and_rejects_extra_fields(api, patch) -> None:
    client, _ = api
    profile_id = provision(client)
    body = {
        "client_record_id": CLIENT_RECORD_ID,
        "metric": "heart_rate",
        "value": 72,
        "unit": "bpm",
        "measured_at": MEASURED_AT,
        "source": "manual",
        "quality": "valid",
    }
    response = client.post(f"/api/v1/profiles/{profile_id}/observations", json={**body, **patch})
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    for submitted_value in ("private-id-value", "private-created-value", "private-profile-value"):
        assert submitted_value not in response.text


def test_private_extra_fields_are_not_echoed_or_logged(api, caplog) -> None:
    client, _ = api
    profile_id = provision(client)
    private_marker = "private narrative must never appear"
    caplog.set_level(logging.INFO, logger="astroorbitx.api")
    response = client.post(
        f"/api/v1/profiles/{profile_id}/observations",
        json={
            "client_record_id": CLIENT_RECORD_ID,
            "metric": "heart_rate",
            "value": 72,
            "unit": "bpm",
            "measured_at": MEASURED_AT,
            "source": "manual",
            "quality": "valid",
            "private_note": private_marker,
        },
    )

    assert response.status_code == 422
    assert private_marker not in response.text
    assert private_marker not in caplog.text


def test_blood_pressure_pair_is_required_and_no_extra_observation_values(api) -> None:
    client, _ = api
    profile_id = provision(client)
    body = {
        "client_record_id": CLIENT_RECORD_ID,
        "metric": "blood_pressure",
        "systolic": 120,
        "unit": "mmHg",
        "measured_at": MEASURED_AT,
        "source": "manual",
        "quality": "valid",
    }
    assert client.post(f"/api/v1/profiles/{profile_id}/observations", json=body).status_code == 422
    assert client.post(
        f"/api/v1/profiles/{profile_id}/observations",
        json={**body, "diastolic": 80, "value": 70},
    ).status_code == 422


def test_body_temperature_has_no_clinical_thresholds(api) -> None:
    client, _ = api
    profile_id = provision(client)
    body = {
        "client_record_id": CLIENT_RECORD_ID,
        "metric": "body_temperature",
        "value": 100,
        "unit": "°C",
        "measured_at": MEASURED_AT,
        "source": "manual",
        "quality": "suspect",
    }
    response = client.post(f"/api/v1/profiles/{profile_id}/observations", json=body)
    assert response.status_code == 201
    assert response.json()["value"] == 100


@pytest.mark.parametrize(
    ("measured_at", "normalized"),
    [
        ("2026-01-01T00:15:00+01:00", "2025-12-31T23:15:00Z"),
        ("2026-12-31T23:45:00-02:00", "2027-01-01T01:45:00Z"),
    ],
)
def test_observation_time_offset_boundaries_are_normalized(api, measured_at, normalized) -> None:
    client, _ = api
    profile_id = provision(client)
    body = {
        "client_record_id": CLIENT_RECORD_ID,
        "metric": "heart_rate",
        "value": 72,
        "unit": "bpm",
        "measured_at": measured_at,
        "source": "manual",
        "quality": "valid",
    }
    result = client.post(f"/api/v1/profiles/{profile_id}/observations", json=body)
    assert result.status_code == 201
    assert result.json()["measured_at"] == normalized


@pytest.mark.parametrize("measured_at", ["2026-11-14T12:30:00", "2026-02-30T12:30:00Z", "2026-11-14"])
def test_observation_rejects_malformed_timestamps(api, measured_at) -> None:
    client, _ = api
    profile_id = provision(client)
    body = {
        "client_record_id": CLIENT_RECORD_ID,
        "metric": "heart_rate",
        "value": 72,
        "unit": "bpm",
        "measured_at": measured_at,
        "source": "manual",
        "quality": "valid",
    }
    response = client.post(f"/api/v1/profiles/{profile_id}/observations", json=body)
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert measured_at not in response.text


def test_sleep_create_retry_conflict_and_list(api) -> None:
    client, app = api
    profile_id = provision(client)
    body = {
        "client_record_id": CLIENT_RECORD_ID,
        "duration_minutes": 420,
        "reporting_date": "2026-11-14",
        "includes_naps": False,
        "source": "manual",
        "quality": "valid",
    }
    first = client.post(f"/api/v1/profiles/{profile_id}/sleep-records", json=body)
    retry = client.post(f"/api/v1/profiles/{profile_id}/sleep-records", json=body)
    conflict = client.post(f"/api/v1/profiles/{profile_id}/sleep-records", json={**body, "duration_minutes": 421})
    assert first.status_code == 201
    assert retry.status_code == 200 and retry.json()["replayed"] is True
    assert retry.json()["id"] == first.json()["id"]
    assert conflict.status_code == 409
    assert "420" not in conflict.text and "421" not in conflict.text
    listing = client.get(f"/api/v1/profiles/{profile_id}/sleep-records")
    list_item = listing.json()["items"][0]
    assert list_item == {key: value for key, value in first.json().items() if key != "replayed"}
    assert "replayed" not in list_item
    assert list_item["reporting_date"] == "2026-11-14"
    assert set(first.json()) == {
        "id",
        "profile_id",
        "client_record_id",
        "duration_minutes",
        "reporting_date",
        "includes_naps",
        "source",
        "quality",
        "is_synthetic",
        "created_at",
        "replayed",
    }
    with app.state.session_factory() as session:
        assert session.query(SleepRecord).count() == 1


@pytest.mark.parametrize(
    "patch",
    [
        {"duration_minutes": 0},
        {"duration_minutes": "420"},
        {"reporting_date": "2026-11-14T00:00:00Z"},
        {"includes_naps": "sometimes"},
        {"includes_naps": "false"},
        {"profile_id": str(PROFILE_ID)},
        {"is_synthetic": False},
    ],
)
def test_sleep_validation_rejects_invalid_and_extra_fields(api, patch) -> None:
    client, _ = api
    profile_id = provision(client)
    body = {
        "client_record_id": CLIENT_RECORD_ID,
        "duration_minutes": 420,
        "reporting_date": "2026-11-14",
        "includes_naps": False,
        "source": "manual",
        "quality": "valid",
    }
    response = client.post(f"/api/v1/profiles/{profile_id}/sleep-records", json={**body, **patch})
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    if "profile_id" in patch:
        assert str(patch["profile_id"]) not in response.text


@pytest.mark.parametrize(
    ("reporting_date", "expected_status"),
    [
        ("2024-02-29", 201),
        ("9999-12-31", 201),
        ("2025-02-29", 422),
        ("2026-11-14T00:00:00Z", 422),
        ("2026-2-04", 422),
    ],
)
def test_sleep_reporting_date_boundaries(api, reporting_date, expected_status) -> None:
    client, _ = api
    profile_id = provision(client)
    body = {
        "client_record_id": CLIENT_RECORD_ID,
        "duration_minutes": 420,
        "reporting_date": reporting_date,
        "includes_naps": False,
        "source": "manual",
        "quality": "valid",
    }
    response = client.post(f"/api/v1/profiles/{profile_id}/sleep-records", json=body)
    assert response.status_code == expected_status
    if expected_status == 201:
        assert response.json()["reporting_date"] == reporting_date
    else:
        assert reporting_date not in response.text


def test_record_list_order_and_pagination(api) -> None:
    client, app = api
    profile_id = provision(client)
    base_time = datetime(2026, 11, 14, 12, 0, tzinfo=timezone.utc)
    ids = [
        uuid.UUID("55555555-5555-4555-8555-555555555555"),
        uuid.UUID("66666666-6666-4666-8666-666666666666"),
        uuid.UUID("77777777-7777-4777-8777-777777777777"),
    ]
    with app.state.session_factory.begin() as session:
        session.add_all(
            [
                VitalObservation(
                    id=record_id,
                    profile_id=uuid.UUID(profile_id),
                    client_record_id=uuid.uuid4(),
                    metric="heart_rate",
                    value=float(index + 60),
                    unit="bpm",
                    measured_at=base_time,
                    source="manual",
                    quality="valid",
                    created_at=base_time,
                )
                for index, record_id in enumerate(ids)
            ]
        )
    first_page = client.get(f"/api/v1/profiles/{profile_id}/observations?limit=2&offset=0").json()
    second_page = client.get(f"/api/v1/profiles/{profile_id}/observations?limit=2&offset=2").json()
    assert [item["id"] for item in first_page["items"]] == [str(ids[2]), str(ids[1])]
    assert [item["id"] for item in second_page["items"]] == [str(ids[0])]
    assert first_page["limit"] == 2 and first_page["offset"] == 0
    assert second_page["limit"] == 2 and second_page["offset"] == 2
    assert "replayed" not in first_page["items"][0]
    invalid = client.get(f"/api/v1/profiles/{profile_id}/observations?limit=101")
    assert invalid.status_code == 422
    assert "101" not in invalid.text


def test_sleep_record_list_order_and_pagination(api) -> None:
    client, app = api
    profile_id = provision(client)
    base_time = datetime(2026, 11, 14, 12, 0, tzinfo=timezone.utc)
    ids = [
        uuid.UUID("88888888-8888-4888-8888-888888888888"),
        uuid.UUID("99999999-9999-4999-8999-999999999999"),
    ]
    with app.state.session_factory.begin() as session:
        session.add_all(
            [
                SleepRecord(
                    id=record_id,
                    profile_id=uuid.UUID(profile_id),
                    client_record_id=uuid.uuid4(),
                    duration_minutes=400 + index,
                    reporting_date=base_time.date(),
                    includes_naps=False,
                    source="manual",
                    quality="valid",
                    created_at=base_time,
                )
                for index, record_id in enumerate(ids)
            ]
        )
    first = client.get(f"/api/v1/profiles/{profile_id}/sleep-records?limit=1&offset=0").json()
    second = client.get(f"/api/v1/profiles/{profile_id}/sleep-records?limit=1&offset=1").json()
    assert [item["id"] for item in first["items"]] == [str(ids[1])]
    assert [item["id"] for item in second["items"]] == [str(ids[0])]


def test_product_routes_are_disabled_in_production(tmp_path: Path) -> None:
    app = create_app(
        Settings(
            app_environment="production",
            database_url=f"sqlite:///{(tmp_path / 'production.db').as_posix()}",
            _env_file=None,
        )
    )
    with TestClient(app) as client:
        assert client.get("/api/v1/profiles").status_code == 404
        assert client.get("/api/v1/profiles/not-a-uuid").status_code == 404
        assert client.post(
            f"/api/v1/profiles/{PROFILE_ID}/sleep-records",
            json={},
        ).status_code == 404
        assert client.get("/api/v1/health").status_code == 200
        assert "/api/v1/profiles" not in app.openapi()["paths"]


def test_nonexistent_profile_record_routes_return_404(api) -> None:
    client, _ = api
    unknown = str(uuid.uuid4())
    assert client.get(f"/api/v1/profiles/{unknown}/observations").status_code == 404
    assert client.get(f"/api/v1/profiles/{unknown}/sleep-records").status_code == 404
    payload = {
        "client_record_id": CLIENT_RECORD_ID,
        "duration_minutes": 420,
        "reporting_date": "2026-11-14",
        "includes_naps": False,
        "source": "manual",
        "quality": "valid",
    }
    observation = {
        "client_record_id": CLIENT_RECORD_ID,
        "metric": "heart_rate",
        "value": 72,
        "unit": "bpm",
        "measured_at": MEASURED_AT,
        "source": "manual",
        "quality": "valid",
    }
    assert client.post(f"/api/v1/profiles/{unknown}/observations", json=observation).status_code == 404
    assert client.post(f"/api/v1/profiles/{unknown}/sleep-records", json=payload).status_code == 404
    assert client.get("/api/v1/profiles/not-a-uuid/observations").status_code == 422
    assert client.get("/api/v1/profiles/not-a-uuid/sleep-records").status_code == 422


def test_openapi_product_routes_and_schemas_match_approved_reference(api) -> None:
    _, app = api
    schema = app.openapi()
    paths = schema["paths"]
    actual_operations = {
        (path, method): operation["operationId"]
        for path, methods in paths.items()
        if path.startswith("/api/v1/profiles")
        for method, operation in methods.items()
    }
    assert actual_operations == PRODUCT_OPERATIONS

    schemas = schema["components"]["schemas"]
    expected_profile = {"id", "display_name", "is_synthetic"}
    expected_observation_common = {
        "id",
        "profile_id",
        "client_record_id",
        "metric",
        "unit",
        "measured_at",
        "source",
        "quality",
        "is_synthetic",
        "created_at",
    }
    expected_sleep = {
        "id",
        "profile_id",
        "client_record_id",
        "duration_minutes",
        "reporting_date",
        "includes_naps",
        "source",
        "quality",
        "is_synthetic",
        "created_at",
    }

    def properties(schema_name: str) -> set[str]:
        return set(schemas[schema_name]["properties"])

    assert properties("ProfileResponse") == expected_profile
    assert set(schemas["ProfileResponse"]["required"]) == expected_profile
    assert schemas["ProfileResponse"]["additionalProperties"] is False
    assert schemas["ProfileResponse"]["properties"]["id"]["format"] == "uuid"
    assert schemas["ProfileResponse"]["properties"]["display_name"]["minLength"] == 1
    assert schemas["ProfileResponse"]["properties"]["display_name"]["maxLength"] == 120
    assert schemas["ProfileResponse"]["properties"]["display_name"]["type"] == "string"
    assert schemas["ProfileResponse"]["properties"]["is_synthetic"]["const"] is True
    assert properties("ProfileCollection") == {"items", "limit", "offset"}
    assert set(schemas["ProfileCollection"]["required"]) == {"items", "limit", "offset"}
    assert properties("ObservationCollection") == {"items", "limit", "offset"}
    assert properties("SleepCollection") == {"items", "limit", "offset"}
    for collection_name in ("ProfileCollection", "ObservationCollection", "SleepCollection"):
        assert schemas[collection_name]["properties"]["limit"]["minimum"] == 1
        assert schemas[collection_name]["properties"]["limit"]["maximum"] == 100
        assert schemas[collection_name]["properties"]["offset"]["minimum"] == 0
    assert schemas["ProfileCollection"]["properties"]["items"]["items"]["$ref"] == (
        "#/components/schemas/ProfileResponse"
    )
    assert schemas["SleepCollection"]["properties"]["items"]["items"]["$ref"] == (
        "#/components/schemas/SleepResponse"
    )

    expected_observation_variants = {
        "HeartRateResponse": expected_observation_common | {"value"},
        "BloodPressureResponse": expected_observation_common | {"systolic", "diastolic"},
        "BodyTemperatureResponse": expected_observation_common | {"value"},
        "HeartRateCreateResult": expected_observation_common | {"value", "replayed"},
        "BloodPressureCreateResult": expected_observation_common | {"systolic", "diastolic", "replayed"},
        "BodyTemperatureCreateResult": expected_observation_common | {"value", "replayed"},
    }
    for name, fields in expected_observation_variants.items():
        assert properties(name) == fields
        assert set(schemas[name]["required"]) == fields
        assert schemas[name]["additionalProperties"] is False
        assert schemas[name]["properties"]["is_synthetic"]["const"] is True
        assert schemas[name]["properties"]["client_record_id"]["format"] == "uuid"
        assert schemas[name]["properties"]["profile_id"]["format"] == "uuid"
        assert schemas[name]["properties"]["id"]["format"] == "uuid"
        assert schemas[name]["properties"]["measured_at"]["format"] == "date-time"
        assert schemas[name]["properties"]["created_at"]["format"] == "date-time"
        assert schemas[name]["properties"]["unit"]["type"] == "string"
        assert schemas[name]["properties"]["source"]["enum"] == ["manual", "simulated_device"]
        assert schemas[name]["properties"]["quality"]["enum"] == ["valid", "suspect", "invalid"]
        if "replayed" in fields:
            assert schemas[name]["properties"]["replayed"]["type"] == "boolean"
    assert schemas["HeartRateResponse"]["properties"]["metric"]["const"] == "heart_rate"
    assert schemas["HeartRateResponse"]["properties"]["unit"]["const"] == "bpm"
    assert schemas["BloodPressureResponse"]["properties"]["metric"]["const"] == "blood_pressure"
    assert schemas["BloodPressureResponse"]["properties"]["unit"]["const"] == "mmHg"
    assert schemas["BodyTemperatureResponse"]["properties"]["metric"]["const"] == "body_temperature"
    assert schemas["BodyTemperatureResponse"]["properties"]["unit"]["const"] == "°C"
    assert schemas["HeartRateResponse"]["properties"]["value"]["exclusiveMinimum"] == 0
    assert schemas["BloodPressureResponse"]["properties"]["systolic"]["exclusiveMinimum"] == 0
    assert schemas["BloodPressureResponse"]["properties"]["diastolic"]["exclusiveMinimum"] == 0
    assert schemas["BodyTemperatureResponse"]["properties"]["value"]["exclusiveMinimum"] == 0
    assert properties("SleepResponse") == expected_sleep
    assert set(schemas["SleepResponse"]["required"]) == expected_sleep
    assert properties("SleepCreateResult") == expected_sleep | {"replayed"}
    assert set(schemas["SleepCreateResult"]["required"]) == expected_sleep | {"replayed"}
    for name in ("SleepResponse", "SleepCreateResult"):
        assert schemas[name]["additionalProperties"] is False
        assert schemas[name]["properties"]["id"]["format"] == "uuid"
        assert schemas[name]["properties"]["profile_id"]["format"] == "uuid"
        assert schemas[name]["properties"]["client_record_id"]["format"] == "uuid"
        assert schemas[name]["properties"]["reporting_date"]["format"] == "date"
        assert schemas[name]["properties"]["duration_minutes"]["exclusiveMinimum"] == 0
        assert schemas[name]["properties"]["duration_minutes"]["type"] == "integer"
        assert schemas[name]["properties"]["includes_naps"]["type"] == "boolean"
        assert schemas[name]["properties"]["is_synthetic"]["const"] is True
        assert schemas[name]["properties"]["created_at"]["format"] == "date-time"
        assert schemas[name]["properties"]["source"]["enum"] == ["manual", "simulated_device"]
        assert schemas[name]["properties"]["quality"]["enum"] == ["valid", "suspect", "invalid"]

    request_variants = paths["/api/v1/profiles/{profile_id}/observations"]["post"]["requestBody"][
        "content"
    ]["application/json"]["schema"]["oneOf"]
    request_variant_names = {
        ref["$ref"].rsplit("/", 1)[-1]
        for ref in request_variants
    }
    assert request_variant_names == {"HeartRateCreate", "BloodPressureCreate", "BodyTemperatureCreate"}
    discriminator = paths["/api/v1/profiles/{profile_id}/observations"]["post"]["requestBody"][
        "content"
    ]["application/json"]["schema"]["discriminator"]
    assert discriminator["propertyName"] == "metric"
    assert discriminator["mapping"] == {
        "heart_rate": "#/components/schemas/HeartRateCreate",
        "blood_pressure": "#/components/schemas/BloodPressureCreate",
        "body_temperature": "#/components/schemas/BodyTemperatureCreate",
    }
    assert set(schemas["HeartRateCreate"]["required"]) == {
        "client_record_id", "source", "quality", "measured_at", "metric", "value", "unit"
    }
    assert set(schemas["BloodPressureCreate"]["required"]) == {
        "client_record_id", "source", "quality", "measured_at", "metric", "systolic", "diastolic", "unit"
    }
    assert set(schemas["BodyTemperatureCreate"]["required"]) == {
        "client_record_id", "source", "quality", "measured_at", "metric", "value", "unit"
    }
    request_shapes = {
        "HeartRateCreate": ("heart_rate", "bpm", {"value"}),
        "BloodPressureCreate": ("blood_pressure", "mmHg", {"systolic", "diastolic"}),
        "BodyTemperatureCreate": ("body_temperature", "°C", {"value"}),
    }
    for name, (metric, unit, value_fields) in request_shapes.items():
        request_schema = schemas[name]
        assert request_schema["additionalProperties"] is False
        assert request_schema["properties"]["client_record_id"]["format"] == "uuid"
        assert request_schema["properties"]["metric"]["const"] == metric
        assert request_schema["properties"]["unit"]["const"] == unit
        assert request_schema["properties"]["source"]["enum"] == ["manual", "simulated_device"]
        assert request_schema["properties"]["quality"]["enum"] == ["valid", "suspect", "invalid"]
        assert request_schema["properties"]["measured_at"]["format"] == "date-time"
        assert request_schema["properties"]["measured_at"]["pattern"]
        assert request_schema["properties"]["measured_at"]["type"] == "string"
        assert request_schema["properties"]["unit"]["type"] == "string"
        assert request_schema["properties"]["metric"]["type"] == "string"
        for field in value_fields:
            assert request_schema["properties"][field]["type"] == "number"
            assert request_schema["properties"][field]["exclusiveMinimum"] == 0
    assert properties("SleepCreate") == {
        "client_record_id",
        "source",
        "quality",
        "duration_minutes",
        "reporting_date",
        "includes_naps",
    }
    assert set(schemas["SleepCreate"]["required"]) == properties("SleepCreate")
    assert schemas["SleepCreate"]["additionalProperties"] is False
    assert schemas["SleepCreate"]["properties"]["client_record_id"]["format"] == "uuid"
    assert schemas["SleepCreate"]["properties"]["duration_minutes"]["exclusiveMinimum"] == 0
    assert schemas["SleepCreate"]["properties"]["reporting_date"]["format"] == "date"
    assert schemas["SleepCreate"]["properties"]["duration_minutes"]["type"] == "integer"
    assert schemas["SleepCreate"]["properties"]["includes_naps"]["type"] == "boolean"
    assert schemas["SleepCreate"]["properties"]["source"]["enum"] == ["manual", "simulated_device"]
    assert schemas["SleepCreate"]["properties"]["quality"]["enum"] == ["valid", "suspect", "invalid"]

    expected_errors = {
        ("/api/v1/profiles", "get"): {"422", "500"},
        ("/api/v1/profiles/{profile_id}", "get"): {"404", "422", "500"},
        ("/api/v1/profiles/{profile_id}/observations", "get"): {"404", "422", "500"},
        ("/api/v1/profiles/{profile_id}/observations", "post"): {"404", "409", "422", "500"},
        ("/api/v1/profiles/{profile_id}/sleep-records", "get"): {"404", "422", "500"},
        ("/api/v1/profiles/{profile_id}/sleep-records", "post"): {"404", "409", "422", "500"},
    }
    for (path, method), operation_id in PRODUCT_OPERATIONS.items():
        operation = paths[path][method]
        assert operation["operationId"] == operation_id
        success_codes = {"201", "200"} if method == "post" else {"200"}
        assert set(operation["responses"]) == success_codes | expected_errors[(path, method)]
        if method == "post":
            request_body = operation["requestBody"]
            assert request_body["required"] is True
            assert set(request_body["content"]) == {"application/json"}
            replay_schema = operation["responses"]["200"]["content"]["application/json"]["schema"]
            create_schema = operation["responses"]["201"]["content"]["application/json"]["schema"]
            assert {key: value for key, value in replay_schema.items() if key != "title"} == {
                key: value for key, value in create_schema.items() if key != "title"
            }
        else:
            assert "requestBody" not in operation
        if method == "get" and path in {
            "/api/v1/profiles",
            "/api/v1/profiles/{profile_id}/observations",
            "/api/v1/profiles/{profile_id}/sleep-records",
        }:
            parameters = {parameter["name"]: parameter for parameter in operation["parameters"]}
            assert set(parameters) == ({"limit", "offset"} if path == "/api/v1/profiles" else {
                "profile_id", "limit", "offset"
            })
            assert parameters["limit"]["schema"]["default"] == 20
            assert parameters["limit"]["schema"]["minimum"] == 1
            assert parameters["limit"]["schema"]["maximum"] == 100
            assert parameters["limit"]["required"] is False
            assert parameters["offset"]["schema"]["default"] == 0
            assert parameters["offset"]["schema"]["minimum"] == 0
            assert parameters["offset"]["required"] is False
            if "profile_id" in parameters:
                assert parameters["profile_id"]["required"] is True
                assert parameters["profile_id"]["schema"]["format"] == "uuid"
        for code in success_codes:
            success_response = operation["responses"][code]
            assert set(success_response["content"]) == {"application/json"}
        assert expected_errors[(path, method)] <= set(operation["responses"])
        for code in expected_errors[(path, method)]:
            error_response = operation["responses"][code]
            assert "application/problem+json" in error_response["content"]
            error_schema = error_response["content"]["application/problem+json"]["schema"]
            assert error_schema["$ref"] == "#/components/schemas/ProblemDetails"
            assert "X-Request-ID" in error_response["headers"]
        for code in success_codes:
            assert "X-Request-ID" in operation["responses"][code]["headers"]

    assert set(schemas["ProblemDetails"]["properties"]) == {
        "type", "title", "status", "detail", "request_id", "errors"
    }
    assert set(schemas["ProblemDetails"]["required"]) == {"type", "title", "status", "detail", "request_id"}
    assert schemas["ProblemDetails"]["properties"]["request_id"]["format"] == "uuid"
    assert schemas["ProblemDetails"]["properties"]["errors"]["type"] == "array"
    assert schemas["ProblemDetails"]["additionalProperties"] is False
    assert "default" not in schemas["ProblemDetails"]["properties"]["errors"]
    assert schemas["ProblemDetails"]["properties"]["errors"]["items"]["$ref"] == (
        "#/components/schemas/ValidationFieldError"
    )
    assert set(schemas["ValidationFieldError"]["properties"]) == {"field", "code", "message"}
    assert set(schemas["ValidationFieldError"]["required"]) == {"field", "code", "message"}
    assert set(paths) == {
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
        *{path for path, _ in PRODUCT_OPERATIONS},
    }
