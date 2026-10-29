"""
FusionAI API Routes Package

Exports all routers for both Person A (entity resolution/retrieval)
and Person B (ranking, feedback, streaming, demo).
"""

# Person A — Qloo entity resolution & retrieval
from .health import router as health_router
from .resolve import router as resolve_router
from .retrieve import router as retrieve_router

# Person B — ranking, feedback, streaming, demo families
from .recommend import router as recommend_router
from .feedback import router as feedback_router
from .stream import router as stream_router
from .demo import router as demo_router

__all__ = [
    # Person A
    "health_router",
    "resolve_router",
    "retrieve_router",
    # Person B
    "recommend_router",
    "feedback_router",
    "stream_router",
    "demo_router",
]
