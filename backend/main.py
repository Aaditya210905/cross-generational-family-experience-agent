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
