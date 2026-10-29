"""
Family-related data contracts.

Defines what the frontend sends: family members, their preferences, and constraints.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class GenerationLabel(str, Enum):
    """Generation label for a family member."""
    GRANDPARENT = "grandparent"
    PARENT = "parent"
    TEEN = "teen"
    CHILD = "child"
    YOUNG_ADULT = "young_adult"


class CategoryType(str, Enum):
    """Supported recommendation categories."""
    MOVIES = "movies"
    RESTAURANTS = "restaurants"
    ACTIVITIES = "activities"


class Preference(BaseModel):
    """A single preference item from a family member."""
    text: str = Field(..., description="Raw preference text, e.g. 'Bollywood classics'")
    category: Optional[CategoryType] = Field(
        default=None,
        description="Intended category if known",
    )
    is_dislike: bool = Field(
        default=False,
        description="True if this is something they dislike",
    )


class FamilyMember(BaseModel):
    """A single family member with their preferences."""
    id: str = Field(..., description="Unique member ID (client-generated)")
    nickname: str = Field(..., description="Display name", min_length=1, max_length=50)
    generation: GenerationLabel = Field(..., description="Generation label")
    liked_items: list[Preference] = Field(
        default_factory=list,
        description="Things this person enjoys",
    )
    disliked_items: list[Preference] = Field(
        default_factory=list,
        description="Things this person dislikes",
    )


class FamilyProfileRequest(BaseModel):
    """
    The top-level request from the frontend.
    Contains the full family profile and desired category.
    """
    members: list[FamilyMember] = Field(
        ...,
        description="2-4 family members",
        min_length=2,
        max_length=4,
    )
    category: CategoryType = Field(
        ...,
        description="What kind of recommendation to generate",
    )
    constraints: Optional["ConstraintConfig"] = Field(
        default=None,
        description="Optional activity constraints",
    )
    adjustment: Optional["AdjustmentSet"] = Field(
        default=None,
        description="Feedback adjustments from a previous round",
    )


# Avoid circular import — these are imported at runtime
from .common import ConstraintConfig, AdjustmentSet  # noqa: E402

FamilyProfileRequest.model_rebuild()
