"""
FamilyFusion AI — FastAPI Application

Main entry point for the backend. Registers routes, middleware,
error handlers, and lifecycle events.
"""

import sys
from pathlib import Path

# Ensure project root is on sys.path
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.config import settings
from backend.qloo.client import get_qloo_client
from backend.routes import health_router, resolve_router, retrieve_router, demo_router

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifecycle ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 FamilyFusion AI backend starting up...")
    logger.info(f"   Qloo base URL: {settings.qloo_base_url}")
    logger.info(f"   Cache TTL: {settings.cache_ttl_seconds}s")
    logger.info(f"   Allowed origins: {settings.allowed_origins_list}")
    yield
    # Shutdown: close the Qloo client
    client = get_qloo_client()
    await client.close()
    logger.info("👋 FamilyFusion AI backend shut down.")


# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FamilyFusion AI",
    description=(
        "Cross-Generational Family Experience Agent — "
        "finds activities the whole family will enjoy using Qloo's taste intelligence."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handler ─────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all error handler.
    
    Ensures the frontend always gets a structured error response.
    """
    logger.exception(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "An unexpected error occurred. Please try again.",
            "detail": {"type": type(exc).__name__, "info": str(exc)},
        },
    )


# ── Register routes ──────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(resolve_router)
app.include_router(retrieve_router)
app.include_router(demo_router)


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Root endpoint — service info."""
    return {
        "service": "FamilyFusion AI",
        "version": "1.0.0",
        "description": "Cross-Generational Family Experience Agent",
        "docs": "/docs",
        "health": "/health",
    }

"""
FusionAI — FastAPI Application

Main application entry point with CORS, error handling,
rate limiting, and route registration.
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import get_settings
from backend.routes import demo, feedback, recommend, stream
from contracts.models import ErrorResponse

# ─── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-25s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fusionai")

# ─── App ─────────────────────────────────────────────────────────────────────

settings = get_settings()
origins = [o.strip() for o in settings.cors_origins.split(",")]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info(f"  FusionAI v{settings.app_version} starting up")
    logger.info(f"  Environment: {settings.app_env}")
    logger.info(f"  CORS origins: {origins}")
    logger.info(f"  LLM configured: {bool(settings.openai_api_key)}")
    logger.info(f"  Qloo configured: {bool(settings.qloo_api_key)}")
    logger.info(f"  Rate limit: {settings.rate_limit_per_minute}/min")
    logger.info("=" * 60)
    yield


app = FastAPI(
    title="FusionAI",
    description=(
        "Family activity recommendation engine — "
        "powered by Qloo's cultural taste graph"
    ),
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────

origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Simple Per-IP Rate Limiting ─────────────────────────────────────────────

_rate_limit_store: Dict[str, list] = defaultdict(list)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Basic per-IP rate limiting to protect API quota during demos."""
    # Skip rate limiting for health and docs
    if request.url.path in ("/api/health", "/docs", "/redoc", "/openapi.json"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = 60  # 1 minute window

    # Clean old entries
    _rate_limit_store[client_ip] = [
        t for t in _rate_limit_store[client_ip] if now - t < window
    ]

    if len(_rate_limit_store[client_ip]) >= settings.rate_limit_per_minute:
        return JSONResponse(
            status_code=429,
            content={
                "error": "rate_limited",
                "message": f"Too many requests. Limit: {settings.rate_limit_per_minute}/min",
                "status_code": 429,
            },
        )

    _rate_limit_store[client_ip].append(now)
    return await call_next(request)


# ─── Global Error Handler ────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all error handler so the frontend always gets a clear message."""
    logger.exception(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": str(exc),
            "status_code": 500,
        },
    )


# ─── Routes ─────────────────────────────────────────────────────────────────

app.include_router(recommend.router)
app.include_router(feedback.router)
app.include_router(stream.router)
app.include_router(demo.router)


@app.get("/api/health", tags=["system"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "llm_configured": bool(settings.openai_api_key),
        "qloo_configured": bool(settings.qloo_api_key),
    }


@app.get("/", tags=["system"])
async def root():
    """Root endpoint with API info."""
    return {
        "app": "FusionAI",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
        "description": "Family activity recommendation engine powered by Qloo",
    }


