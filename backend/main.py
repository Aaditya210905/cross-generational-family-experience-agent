"""
FusionAI — FastAPI Application

Main application entry point with CORS, error handling,
rate limiting, and route registration.

Integrates both Person A (Qloo entity resolution/retrieval) and
Person B (ranking, constraints, explanations, feedback, SSE streaming).
"""

from __future__ import annotations

import logging
import sys
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure project root is on sys.path so `backend.*` and `contracts.*` resolve
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.config import settings
from backend.qloo.client import get_qloo_client

# ── Person A routes ──────────────────────────────────────────────────────────
from backend.routes.health import router as health_router
from backend.routes.resolve import router as resolve_router
from backend.routes.retrieve import router as retrieve_router

# ── Person B routes ──────────────────────────────────────────────────────────
from backend.routes.recommend import router as recommend_router
from backend.routes.feedback import router as feedback_router
from backend.routes.stream import router as stream_router
from backend.routes.demo import router as demo_router

# ─── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s │ %(name)-25s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fusionai")


# ─── Lifecycle ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("=" * 60)
    logger.info(f"  FusionAI v{settings.app_version} starting up")
    logger.info(f"  Environment: {settings.app_env}")
    logger.info(f"  Qloo base URL: {settings.qloo_base_url}")
    logger.info(f"  CORS origins: {settings.allowed_origins_list}")
    logger.info(f"  LLM configured: {bool(settings.openai_api_key)}")
    logger.info(f"  Qloo configured: {bool(settings.qloo_api_key)}")
    logger.info(f"  Rate limit: {settings.rate_limit_per_minute}/min")
    logger.info(f"  Cache TTL: {settings.cache_ttl_seconds}s")
    logger.info("=" * 60)
    yield
    # Shutdown: close the Qloo HTTP client
    client = get_qloo_client()
    await client.close()
    logger.info("👋 FusionAI backend shut down.")


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="FusionAI",
    description=(
        "Cross-Generational Family Experience Agent — "
        "finds activities the whole family will enjoy using Qloo's taste intelligence."
    ),
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ─── CORS ────────────────────────────────────────────────────────────────────

origins = settings.allowed_origins_list
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
    # Skip rate limiting for health, docs, and static
    skip_paths = ("/health", "/api/health", "/docs", "/redoc", "/openapi.json")
    if request.url.path in skip_paths:
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
    """Catch-all error handler so the frontend always gets a structured response."""
    logger.exception(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "An unexpected error occurred. Please try again.",
            "detail": {"type": type(exc).__name__, "info": str(exc)},
            "status_code": 500,
        },
    )


# ─── Register Routes ────────────────────────────────────────────────────────

# Person A — entity resolution & retrieval
app.include_router(health_router)
app.include_router(resolve_router)
app.include_router(retrieve_router)

# Person B — ranking, feedback, streaming, demo
app.include_router(recommend_router)
app.include_router(feedback_router)
app.include_router(stream_router)
app.include_router(demo_router)


# ─── Root & Health ───────────────────────────────────────────────────────────

@app.get("/api/health", tags=["system"])
async def api_health_check():
    """Health check endpoint (prefixed version)."""
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
        "description": "Cross-Generational Family Experience Agent powered by Qloo",
        "docs": "/docs",
        "health": "/api/health",
    }
