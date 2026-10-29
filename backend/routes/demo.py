"""
FusionAI — Demo Families Route

GET /api/demo-families — List available demo families
GET /api/demo-families/{family_id} — Get a specific demo family profile

Serves pre-built demo families for the "Load Sample Family" button.
Uses typed demo families from contracts (Person B) with fallback
to simple fixtures (Person A).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

# Try contracts (Person B typed models) first, fall back to fixtures (Person A)
try:
    from contracts.demo_families import ALL_DEMO_FAMILIES

    _USE_CONTRACTS = True
except ImportError:
    _USE_CONTRACTS = False

try:
    from backend.fixtures.demo_families import get_demo_family as _get_fixture_family
    from backend.fixtures.demo_families import get_all_demo_families as _get_all_fixture_families

    _USE_FIXTURES = True
except ImportError:
    _USE_FIXTURES = False


router = APIRouter(prefix="/api", tags=["demo"])


@router.get("/demo-families")
async def list_demo_families() -> list[dict]:
    """List all available demo families for one-click loading."""
    if _USE_CONTRACTS:
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

    if _USE_FIXTURES:
        return _get_all_fixture_families()

    return []


@router.get("/demo-families/{family_id}")
async def get_demo_family_detail(family_id: str) -> dict:
    """Get the full profile for a demo family."""
    if _USE_CONTRACTS:
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

    if _USE_FIXTURES:
        family = _get_fixture_family(family_id)
        if not family:
            raise HTTPException(
                status_code=404,
                detail=f"Demo family '{family_id}' not found",
            )
        return family

    raise HTTPException(status_code=404, detail="No demo families configured")
