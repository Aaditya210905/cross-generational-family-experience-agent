"""
Demo families route.

Serves pre-built demo families for the "Load Sample Family" button.
"""

from fastapi import APIRouter
from backend.fixtures.demo_families import get_demo_family, get_all_demo_families

router = APIRouter(prefix="/api", tags=["demo"])


@router.get("/demo-families")
async def list_demo_families():
    """List available demo families (name, description, member count)."""
    return get_all_demo_families()


@router.get("/demo-families/{family_key}")
async def get_demo_family_detail(family_key: str):
    """Get a specific demo family with full member details."""
    family = get_demo_family(family_key)
    if not family:
        return {"error": "not_found", "message": f"Demo family '{family_key}' not found"}
    return family
