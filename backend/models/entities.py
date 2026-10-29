"""
Entity resolution data contracts.

Defines the output of resolving raw preferences into Qloo entities.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    """How confident we are in the entity resolution match."""
    HIGH = "high"       # Exact name match
    MEDIUM = "medium"   # Close / fuzzy match
    LOW = "low"         # Ambiguous, multiple candidates
    UNRESOLVED = "unresolved"  # Could not match


class ResolvedEntity(BaseModel):
    """A preference resolved to a Qloo entity."""
    qloo_id: str = Field(..., description="Qloo entity ID")
    name: str = Field(..., description="Entity display name")
    entity_type: str = Field(..., description="Qloo entity type (e.g., 'movies', 'restaurants')")
    confidence: ConfidenceLevel = Field(..., description="Match confidence level")
    original_text: str = Field(..., description="The original preference text that was resolved")
    tags: list[str] = Field(default_factory=list, description="Tags/genres from Qloo")
    properties: dict = Field(
        default_factory=dict,
        description="Additional properties (location, price, etc.)",
    )
    needs_confirmation: bool = Field(
        default=False,
        description="True if the user should confirm this match",
    )
    user_confirmed: bool = Field(
        default=False,
        description="True if the user has confirmed this match",
    )
    alternatives: list["ResolvedEntity"] = Field(
        default_factory=list,
        description="Alternative matches for ambiguous resolutions",
    )


class ResolvedMember(BaseModel):
    """A family member with their preferences resolved to Qloo entities."""
    member_id: str = Field(..., description="References FamilyMember.id")
    nickname: str = Field(..., description="Display name")
    resolved_likes: list[ResolvedEntity] = Field(
        default_factory=list,
        description="Resolved liked entities",
    )
    resolved_dislikes: list[ResolvedEntity] = Field(
        default_factory=list,
        description="Resolved disliked entities",
    )
    unresolved: list[str] = Field(
        default_factory=list,
        description="Preference texts that could not be resolved",
    )


class ResolvedProfile(BaseModel):
    """The full family profile with all preferences resolved."""
    members: list[ResolvedMember] = Field(..., description="Resolved member profiles")
    resolution_stats: dict = Field(
        default_factory=dict,
        description="Stats: total, resolved, unresolved, needs_confirmation counts",
    )
