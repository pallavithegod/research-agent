from functools import lru_cache

from pydantic import AnyHttpUrl, Field
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

    hmac_secret: str = "replace-with-strong-local-secret"
    supported_payment_assets: str = "USDC"
    supported_payment_networks: str = "base-sepolia,base"
    max_payment_pin_attempts: int = 5
    payment_pin_lock_seconds: int = 900

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
