"""
Entity resolution route.

Resolves raw preference text into verified Qloo entities.
Person A owns this route.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.models.family import FamilyMember, CategoryType
from backend.models.entities import ResolvedProfile, ResolvedEntity
from backend.resolution.resolver import EntityResolver

router = APIRouter(prefix="/api", tags=["resolution"])


class ResolveRequest(BaseModel):
    """Request body for resolving family preferences."""
    members: list[FamilyMember] = Field(..., description="Family members with preferences")
    category: CategoryType = Field(..., description="Recommendation category")


class ResolveSingleRequest(BaseModel):
    """Request body for resolving a single preference (autocomplete)."""
    text: str = Field(..., description="Preference text to resolve")
    entity_type: str = Field(..., description="Entity type hint")


@router.post("/resolve", response_model=ResolvedProfile)
async def resolve_preferences(request: ResolveRequest):
    """
    Resolve all family members' preferences into Qloo entities.

    This is the first step of the pipeline: turning "Bollywood classics"
    into a verified Qloo entity with confidence scoring.
    
    Returns resolved entities with confidence levels and confirmation flags
    for ambiguous matches.
    """
    try:
        resolver = EntityResolver()
        profile = await resolver.resolve_family(
            members=request.members,
            category=request.category,
        )
        return profile

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "resolution_failed",
                "message": f"Failed to resolve preferences: {str(e)}",
            },
        )


@router.post("/resolve/single", response_model=ResolvedEntity | None)
async def resolve_single(request: ResolveSingleRequest):
    """
    Resolve a single preference text (for real-time autocomplete/confirmation).
    
    Used by the preferences screen to show "Did you mean...?" chips
    as the user types.
    """
    try:
        resolver = EntityResolver()
        result = await resolver.resolve_single(
            text=request.text,
            entity_type=request.entity_type,
        )
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "resolution_failed",
                "message": f"Failed to resolve '{request.text}': {str(e)}",
            },
        )
