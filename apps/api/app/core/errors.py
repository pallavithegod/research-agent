import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.observability import current_request_id

logger = logging.getLogger("app.errors")


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", current_request_id())
        logger.exception(
            "unhandled_exception",
            extra={
                "event": "unhandled_exception",
                "path": str(request.url.path),
                "exception_type": exc.__class__.__name__,
            },
        )
        return JSONResponse(
            status_code=500,
            headers={"X-Request-ID": request_id},
            content={
                "detail": "Internal server error",
                "path": str(request.url.path),
                "request_id": request_id,
            },
        )
