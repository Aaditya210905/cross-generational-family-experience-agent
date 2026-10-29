"""
Common/shared data contracts.

Error format, progress events, constraints, and feedback adjustments.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Error Format ──────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """Standardized error response. Every error from the API uses this shape."""
    error: str = Field(..., description="Error type identifier")
    message: str = Field(..., description="Human-readable error message")
    detail: Optional[dict] = Field(default=None, description="Additional error context")


# ── Progress Events (for SSE agent trace) ─────────────────────────────────────

class ProgressStep(str, Enum):
    """Named steps in the recommendation pipeline."""
    RESOLVING = "resolving"
    RESOLVED = "resolved"
    RETRIEVING_PERSONAL = "retrieving_personal"
    RETRIEVING_COMBINED = "retrieving_combined"
    MERGING = "merging"
    NORMALIZING = "normalizing"
    RANKING = "ranking"
    CONSTRAINING = "constraining"
    EXPLAINING = "explaining"
    COMPLETE = "complete"
    ERROR = "error"


class ProgressEvent(BaseModel):
    """A single progress event emitted via SSE."""
    step: ProgressStep = Field(..., description="Current pipeline step")
    status: str = Field(..., description="Status: started, progress, completed, error")
    message: str = Field(..., description="Human-readable progress message")
    detail: Optional[dict] = Field(default=None, description="Additional data for this event")


# ── Constraints ───────────────────────────────────────────────────────────────

class BudgetBand(str, Enum):
    """Budget levels."""
    FREE = "free"
    LOW = "low"         # $
    MEDIUM = "medium"   # $$
    HIGH = "high"       # $$$
    ANY = "any"


class EnergyLevel(str, Enum):
    """Energy level for activities."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    ANY = "any"


class ConstraintConfig(BaseModel):
    """Activity constraints from the family."""
    budget: BudgetBand = Field(default=BudgetBand.ANY, description="Budget band")
    location: Optional[str] = Field(
        default=None,
        description="City or area for place-based recommendations",
    )
    at_home: bool = Field(default=False, description="True = at-home activities only")
    time_available_minutes: Optional[int] = Field(
        default=None,
        description="How much time the family has",
    )
    energy_level: EnergyLevel = Field(
        default=EnergyLevel.ANY,
        description="Desired energy level",
    )
    dietary_restrictions: list[str] = Field(
        default_factory=list,
        description="Dietary needs: vegetarian, vegan, gluten-free, etc.",
    )
    mobility_notes: Optional[str] = Field(
        default=None,
        description="Mobility considerations",
    )


# ── Feedback / Adjustment ─────────────────────────────────────────────────────

class AdjustmentSet(BaseModel):
    """
    Feedback adjustments from a previous recommendation round.
    Person B produces this; Person A's retrieval accepts it.
    """
    excluded_entity_ids: list[str] = Field(
        default_factory=list,
        description="Entity IDs to exclude (disliked)",
    )
    additional_seed_entity_ids: list[str] = Field(
        default_factory=list,
        description="Entity IDs to add as positive signals (liked)",
    )
    diversity_penalty_boost: float = Field(
        default=0.0,
        description="Extra diversity penalty (from 'too similar' feedback)",
    )
    additional_filters: dict = Field(
        default_factory=dict,
        description="Structured filter adjustments from free-text feedback",
    )
