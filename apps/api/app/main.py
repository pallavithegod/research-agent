from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.observability import configure_logging, install_observability


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    if settings.storage_backend == "postgres" and settings.auto_create_database_schema:
        from app.db.session import create_database_schema

        create_database_schema()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    settings.validate_production()
    configure_logging(settings)
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Backend API for the Multi-Step Research Agent with Clerk auth and x402-ready workflows.",
        lifespan=lifespan,
    )
    install_observability(app, settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    install_error_handlers(app)

    return app


app = create_app()
