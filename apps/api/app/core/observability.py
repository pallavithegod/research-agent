import json
import logging
import sys
import time
from contextvars import ContextVar
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request, Response

from app.core.config import Settings

request_id_context: ContextVar[str] = ContextVar("request_id", default="-")

SENSITIVE_HEADER_NAMES = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
    "x-clerk-auth-reason",
    "x-clerk-auth-status",
    "x-clerk-auth-token",
}

SENSITIVE_FIELD_MARKERS = {
    "password",
    "secret",
    "token",
    "authorization",
    "cookie",
    "database_url",
    "mongodb_uri",
    "connection_string",
    "hmac",
    "key",
}


def current_request_id() -> str:
    return request_id_context.get()


def redact_value(value: Any) -> Any:
    if value is None:
        return None
    return "[redacted]"


def redact_mapping(values: dict[str, Any]) -> dict[str, Any]:
    redacted: dict[str, Any] = {}
    for key, value in values.items():
        lowered = key.lower()
        if lowered in SENSITIVE_HEADER_NAMES or any(marker in lowered for marker in SENSITIVE_FIELD_MARKERS):
            redacted[key] = redact_value(value)
        else:
            redacted[key] = value
    return redacted


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = current_request_id()
        return True


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }

        for key, value in record.__dict__.items():
            if key.startswith("_") or key in _standard_log_record_keys():
                continue
            payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(redact_mapping(payload), default=str, separators=(",", ":"))


def _standard_log_record_keys() -> set[str]:
    return {
        "args",
        "asctime",
        "created",
        "exc_info",
        "exc_text",
        "filename",
        "funcName",
        "levelname",
        "levelno",
        "lineno",
        "module",
        "msecs",
        "message",
        "msg",
        "name",
        "pathname",
        "process",
        "processName",
        "relativeCreated",
        "stack_info",
        "thread",
        "threadName",
        "taskName",
        "request_id",
    }


def configure_logging(settings: Settings) -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonLogFormatter())
    handler.addFilter(RequestIdFilter())

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(level)

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(logger_name).handlers.clear()
        logging.getLogger(logger_name).propagate = True

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def install_observability(app: FastAPI, settings: Settings) -> None:
    logger = logging.getLogger("app.request")

    @app.middleware("http")
    async def request_observability_middleware(request: Request, call_next) -> Response:
        incoming_id = request.headers.get("x-request-id") or request.headers.get("x-correlation-id")
        request_id = incoming_id.strip() if incoming_id and len(incoming_id.strip()) <= 128 else uuid4().hex
        token = request_id_context.set(request_id)
        request.state.request_id = request_id
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.exception(
                "request_failed",
                extra={
                    "event": "request_failed",
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                    "client_host": request.client.host if request.client else None,
                },
            )
            request_id_context.reset(token)
            raise

        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_completed",
            extra={
                "event": "request_completed",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_host": request.client.host if request.client else None,
            },
        )
        request_id_context.reset(token)
        return response
