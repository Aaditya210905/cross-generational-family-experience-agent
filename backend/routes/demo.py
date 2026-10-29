"""
FusionAI — Demo Families Route

GET /api/demo-families — List available demo families
GET /api/demo-families/{family_id} — Get a specific demo family profile
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from contracts.demo_families import ALL_DEMO_FAMILIES
Demo families route.

Serves pre-built demo families for the "Load Sample Family" button.
"""

from fastapi import APIRouter
from backend.fixtures.demo_families import get_demo_family, get_all_demo_families

router = APIRouter(prefix="/api", tags=["demo"])


@router.get("/demo-families")
async def list_demo_families() -> list[dict]:
    """List all available demo families for one-click loading."""
    return [
        {
            "family_id": fid,
            "label": data["label"],
            "description": data["description"],
            "member_count": len(data["profile"].members),
            "category": data["profile"].category.value,
            "members": [
                {
                    "nickname": m.nickname,
                    "generation": m.generation.value,
                    "avatar_emoji": m.avatar_emoji,
                    "liked_count": len(m.liked_items),
                }
                for m in data["profile"].members
            ],
        }
        for fid, data in ALL_DEMO_FAMILIES.items()
    ]


@router.get("/demo-families/{family_id}")
async def get_demo_family(family_id: str) -> dict:
    """Get the full profile for a demo family."""
    data = ALL_DEMO_FAMILIES.get(family_id)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Demo family '{family_id}' not found. "
                   f"Available: {list(ALL_DEMO_FAMILIES.keys())}",
        )

    profile = data["profile"]
    return {
        "family_id": family_id,
        "label": data["label"],
        "description": data["description"],
        "profile": profile.model_dump(),
    }
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
