# Routes module — Person B
"""API routes package."""
from .health import router as health_router
from .resolve import router as resolve_router
from .retrieve import router as retrieve_router
from .demo import router as demo_router

__all__ = ["health_router", "resolve_router", "retrieve_router", "demo_router"]
