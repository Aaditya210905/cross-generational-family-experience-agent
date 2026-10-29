"""
Health check route.

Returns service status, Qloo connectivity, and cache stats.
"""

from fastapi import APIRouter
from backend.qloo.client import get_qloo_client
from backend.cache.memory_cache import cache

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns the service status, Qloo API connectivity, and cache statistics.
    """
    qloo_client = get_qloo_client()
    qloo_health = await qloo_client.health_check()

    return {
        "status": "healthy",
        "service": "familyfusion-backend",
        "qloo": qloo_health,
        "cache": cache.stats,
    }
