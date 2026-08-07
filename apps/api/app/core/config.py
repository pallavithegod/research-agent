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
    allow_anonymous_production: bool = False

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/research_agent"
    migrations_database_url: str = ""
    mongodb_uri: str = ""
    mongodb_database: str = "research_agent"
    mongodb_app_name: str = "ResearchAgent"
    mongodb_server_selection_timeout_ms: int = 10000
    storage_backend: str = "postgres"
    auto_create_database_schema: bool = False
    object_storage_bucket: str = ""
    artifact_storage_backend: str = "none"
    azure_blob_connection_string: str = ""
    azure_blob_container: str = ""

    job_queue_backend: str = "sync"
    research_job_queue_name: str = "research:jobs"
    worker_poll_seconds: float = 2.0
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    hmac_secret: str = "replace-with-strong-local-secret"
    supported_payment_assets: str = "USDC"
    supported_payment_networks: str = "base-sepolia,base"
    max_payment_pin_attempts: int = 5
    payment_pin_lock_seconds: int = 900
    x402_enabled: bool = False
    x402_provider_allowlist: str = ""
    x402_timeout_seconds: float = 20.0
    x402_max_response_bytes: int = 1_000_000
    x402_commerce_endpoint: str = ""
    x402_commerce_provider_id: str = "commerce"

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
    deepseek_timeout_seconds: float = 45.0
    deepseek_max_retries: int = 2
    browser_headless: bool = True
    browser_executable_path: str = ""
    browser_timeout_seconds: float = 20.0
    browser_max_sources: int = 8
    browser_artifact_dir: str = "storage/browser"
    brave_search_api_key: str = ""
    tavily_api_key: str = ""
    web_research_timeout_seconds: float = 15.0
    web_research_max_response_bytes: int = 2_000_000
    log_level: str = "INFO"

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
    def allowed_x402_hosts(self) -> set[str]:
        return {item.strip().lower() for item in self.x402_provider_allowlist.split(",") if item.strip()}

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
        if not self.auth_required and not self.allow_anonymous_production:
            errors.append(
                "AUTH_REQUIRED must be true in production unless ALLOW_ANONYMOUS_PRODUCTION=true is explicitly set."
            )
        if self.auth_required and not self.clerk_issuer:
            errors.append("CLERK_ISSUER is required when AUTH_REQUIRED=true.")
        if self.auth_required and not self.resolved_jwks_url:
            errors.append("CLERK_JWKS_URL or CLERK_ISSUER is required when AUTH_REQUIRED=true.")
        if self.frontend_origin and not self.frontend_origin.startswith("https://"):
            errors.append("FRONTEND_ORIGIN must be an https URL in production.")
        if self.auto_create_database_schema:
            errors.append("AUTO_CREATE_DATABASE_SCHEMA must be false in production; run Alembic migrations instead.")
        if self.storage_backend not in {"postgres", "mongodb"}:
            errors.append("STORAGE_BACKEND must be postgres or mongodb in production.")
        if self.storage_backend == "mongodb":
            if not self.mongodb_uri.startswith(("mongodb://", "mongodb+srv://")):
                errors.append("MONGODB_URI must be a valid MongoDB connection URI.")
            if "<db_password>" in self.mongodb_uri or "URL_ENCODED_PASSWORD" in self.mongodb_uri:
                errors.append("MONGODB_URI still contains a password placeholder.")
            if not self.mongodb_database.strip():
                errors.append("MONGODB_DATABASE is required when STORAGE_BACKEND=mongodb.")
            if self.mongodb_server_selection_timeout_ms < 1000:
                errors.append("MONGODB_SERVER_SELECTION_TIMEOUT_MS must be at least 1000.")
        if self.artifact_storage_backend not in {"none", "azure_blob"}:
            errors.append("ARTIFACT_STORAGE_BACKEND must be none or azure_blob.")
        if self.artifact_storage_backend == "azure_blob" and (
            not self.azure_blob_connection_string or not self.azure_blob_container
        ):
            errors.append("AZURE_BLOB_CONNECTION_STRING and AZURE_BLOB_CONTAINER are required when ARTIFACT_STORAGE_BACKEND=azure_blob.")
        if self.job_queue_backend not in {"sync", "upstash"}:
            errors.append("JOB_QUEUE_BACKEND must be sync or upstash.")
        if self.job_queue_backend == "upstash" and (
            not self.upstash_redis_rest_url or not self.upstash_redis_rest_token
        ):
            errors.append("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required when JOB_QUEUE_BACKEND=upstash.")
        if self.worker_poll_seconds <= 0:
            errors.append("WORKER_POLL_SECONDS must be greater than 0.")
        if self.deepseek_api_key and not self.deepseek_base_url.startswith("https://"):
            errors.append("DEEPSEEK_BASE_URL must be an https URL when DeepSeek is enabled.")
        if self.deepseek_timeout_seconds <= 0:
            errors.append("DEEPSEEK_TIMEOUT_SECONDS must be greater than 0.")
        if self.deepseek_max_retries < 0 or self.deepseek_max_retries > 5:
            errors.append("DEEPSEEK_MAX_RETRIES must be between 0 and 5.")
        if self.web_research_timeout_seconds <= 0 or self.web_research_max_response_bytes < 1024:
            errors.append("Web research timeout and response-size settings must be positive.")
        if self.storage_backend == "postgres":
            if "localhost" in self.database_url or "@db:" in self.database_url:
                errors.append("DATABASE_URL must point to managed PostgreSQL in production, not local Docker.")
            if not self.migrations_database_url:
                errors.append("MIGRATIONS_DATABASE_URL is required in production for Alembic migrations.")
        if self.hmac_secret == "replace-with-strong-local-secret" or len(self.hmac_secret) < 32:
            errors.append("HMAC_SECRET must be replaced with a strong production secret.")
        if not self.deepseek_api_key:
            errors.append("DEEPSEEK_API_KEY is required in production for grounded answer and product synthesis.")
        if not self.tavily_api_key and not self.brave_search_api_key:
            errors.append("TAVILY_API_KEY or BRAVE_SEARCH_API_KEY is required for production web research.")
        if self.x402_enabled and not self.allowed_x402_hosts:
            errors.append("X402_PROVIDER_ALLOWLIST is required when x402 is enabled.")
        if self.x402_enabled and not self.x402_commerce_endpoint.startswith("https://"):
            errors.append("X402_COMMERCE_ENDPOINT must be an https URL when x402 is enabled.")
        if self.x402_timeout_seconds <= 0 or self.x402_max_response_bytes < 1024:
            errors.append("x402 timeout and response-size settings must be positive.")
        if self.log_level.upper() not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            errors.append("LOG_LEVEL must be DEBUG, INFO, WARNING, ERROR, or CRITICAL.")

        if errors:
            raise ValueError("Invalid production configuration: " + " ".join(errors))


@lru_cache
def get_settings() -> Settings:
    return Settings()
