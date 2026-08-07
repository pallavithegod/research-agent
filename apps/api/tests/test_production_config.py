import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app


def production_settings(**overrides) -> Settings:
    values = {
        "environment": "production",
        "frontend_origin": "https://research.example.com",
        "auth_required": False,
        "allow_anonymous_production": True,
        "database_url": "postgresql+psycopg://app:password@db.example.com:5432/research?sslmode=require",
        "migrations_database_url": "postgresql+psycopg://app:password@direct.example.com:5432/research?sslmode=require",
        "storage_backend": "postgres",
        "auto_create_database_schema": False,
        "hmac_secret": "production-test-secret-that-is-long-enough",
        "deepseek_api_key": "deepseek-test-key",
        "tavily_api_key": "tavily-test-key",
        "job_queue_backend": "sync",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_valid_anonymous_prototype_configuration_is_explicit() -> None:
    production_settings().validate_production()


def test_accidental_anonymous_production_is_rejected() -> None:
    settings = production_settings(allow_anonymous_production=False)
    with pytest.raises(ValueError, match="ALLOW_ANONYMOUS_PRODUCTION"):
        settings.validate_production()


def test_production_requires_model_and_live_search_credentials() -> None:
    settings = production_settings(deepseek_api_key="", tavily_api_key="", brave_search_api_key="")
    with pytest.raises(ValueError, match="DEEPSEEK_API_KEY") as error:
        settings.validate_production()
    assert "TAVILY_API_KEY or BRAVE_SEARCH_API_KEY" in str(error.value)


def test_valid_mongodb_production_configuration_does_not_require_postgres() -> None:
    settings = production_settings(
        storage_backend="mongodb",
        mongodb_uri="mongodb+srv://app:" + "test-password@cluster.example.mongodb.net/",
        mongodb_database="research_agent",
        database_url="",
        migrations_database_url="",
    )
    settings.validate_production()


def test_mongodb_backend_requires_an_atlas_uri() -> None:
    settings = production_settings(
        storage_backend="mongodb",
        mongodb_uri="",
        database_url="",
        migrations_database_url="",
    )
    with pytest.raises(ValueError, match="MONGODB_URI"):
        settings.validate_production()


def test_mongodb_backend_rejects_password_placeholder() -> None:
    settings = production_settings(
        storage_backend="mongodb",
        mongodb_uri="mongodb://app:<db_password>@cluster.example.mongodb.net/",
        database_url="",
        migrations_database_url="",
    )
    with pytest.raises(ValueError, match="password placeholder"):
        settings.validate_production()


def test_health_endpoints_are_available() -> None:
    client = TestClient(app)
    assert client.get("/v1/health/live").json() == {"status": "ok"}
    ready = client.get("/v1/health/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"
