from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Research Agent Backend"
    environment: str = "local"
    api_prefix: str = "/v1"
    frontend_origin: str = "http://localhost:3000"

    clerk_issuer: str = ""
    clerk_jwks_url: str = ""
    clerk_audience: str = ""
    auth_required: bool = False

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/research_agent"
    migrations_database_url: str = ""
    storage_backend: str = "postgres"
    auto_create_database_schema: bool = False
    object_storage_bucket: str = ""

    job_queue_backend: str = "sync"
    research_job_queue_name: str = "research:jobs"
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    hmac_secret: str = "replace-with-strong-local-secret"
    supported_payment_assets: str = "USDC"
    supported_payment_networks: str = "base-sepolia,base"
    max_payment_pin_attempts: int = 5
    payment_pin_lock_seconds: int = 900

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        origins = [self.frontend_origin]
        if not self.is_production:
            origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])
        return list(dict.fromkeys(origin for origin in origins if origin))

    @property
    def allowed_assets(self) -> set[str]:
        return {item.strip().upper() for item in self.supported_payment_assets.split(",") if item.strip()}

    @property
    def allowed_networks(self) -> set[str]:
        return {item.strip() for item in self.supported_payment_networks.split(",") if item.strip()}

    @property
    def resolved_jwks_url(self) -> str:
        if self.clerk_jwks_url:
            return self.clerk_jwks_url
        if self.clerk_issuer:
            return f"{self.clerk_issuer.rstrip('/')}/.well-known/jwks.json"
        return ""

    def validate_production(self) -> None:
        if not self.is_production:
            return

        errors: list[str] = []
        if not self.auth_required:
            errors.append("AUTH_REQUIRED must be true in production.")
        if not self.clerk_issuer:
            errors.append("CLERK_ISSUER is required in production.")
        if not self.resolved_jwks_url:
            errors.append("CLERK_JWKS_URL or CLERK_ISSUER is required in production.")
        if not self.frontend_origin.startswith("https://"):
            errors.append("FRONTEND_ORIGIN must be an https URL in production.")
        if self.auto_create_database_schema:
            errors.append("AUTO_CREATE_DATABASE_SCHEMA must be false in production; run Alembic migrations instead.")
        if self.storage_backend != "postgres":
            errors.append("STORAGE_BACKEND must be postgres in production.")
        if self.job_queue_backend not in {"sync", "upstash"}:
            errors.append("JOB_QUEUE_BACKEND must be sync or upstash.")
        if self.job_queue_backend == "upstash" and (
            not self.upstash_redis_rest_url or not self.upstash_redis_rest_token
        ):
            errors.append("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required when JOB_QUEUE_BACKEND=upstash.")
        if "localhost" in self.database_url or "@db:" in self.database_url:
            errors.append("DATABASE_URL must point to managed PostgreSQL in production, not local Docker.")
        if self.hmac_secret == "replace-with-strong-local-secret" or len(self.hmac_secret) < 32:
            errors.append("HMAC_SECRET must be replaced with a strong production secret.")

        if errors:
            raise ValueError("Invalid production configuration: " + " ".join(errors))


@lru_cache
def get_settings() -> Settings:
    return Settings()
