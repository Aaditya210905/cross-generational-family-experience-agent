"""
FusionAI Data Contracts — Shared Models v1.0

All Pydantic models that flow between Person A and Person B.
The CandidatePool is the key handoff object.
"""

from __future__ import annotations

import uuid
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ─── Enums ───────────────────────────────────────────────────────────────────

class GenerationLabel(str, Enum):
    GRANDPARENT = "grandparent"
    PARENT = "parent"
    YOUNG_ADULT = "young_adult"
    TEEN = "teen"
    CHILD = "child"


class Category(str, Enum):
    MOVIES = "movies"
    RESTAURANTS = "restaurants"


class ConstraintType(str, Enum):
    HARD = "hard"
    SOFT = "soft"


class ScoreSource(str, Enum):
    REAL = "real"
    ESTIMATED = "estimated"


class DataSource(str, Enum):
    LIVE_QLOO = "live_qloo"
    CACHED_QLOO = "cached_qloo"
    FALLBACK = "fallback"


class ReactionType(str, Enum):
    LIKE = "like"
    DISLIKE = "dislike"
    TOO_SIMILAR = "too_similar"


class ConstraintStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    UNVERIFIED = "unverified"


class ConfidenceLevel(str, Enum):
    EXACT = "exact"
    NEAR = "near"
    AMBIGUOUS = "ambiguous"


class BudgetBand(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    ANY = "any"


class EnergyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    ANY = "any"


class TimeAvailable(str, Enum):
    SHORT = "short"       # < 1 hour
    MEDIUM = "medium"     # 1-3 hours
    LONG = "long"         # 3+ hours
    ANY = "any"


# ─── Core Domain Models ─────────────────────────────────────────────────────

class TasteItem(BaseModel):
    """A like or dislike, optionally tagged with the preference's own domain."""
    text: str
    category: Optional[str] = None


def coerce_taste_items(value: Any) -> List[TasteItem]:
    """Accept plain strings or {text, category} objects from older clients."""
    if not value:
        return []
    items: List[TasteItem] = []
    for item in value:
        if isinstance(item, TasteItem):
            items.append(item)
        elif isinstance(item, str):
            text = item.strip()
            if text:
                items.append(TasteItem(text=text))
        elif isinstance(item, dict):
            text = str(item.get("text") or "").strip()
            if text:
                items.append(TasteItem(text=text, category=item.get("category")))
        else:
            text = str(getattr(item, "text", item) or "").strip()
            if text:
                items.append(TasteItem(
                    text=text,
                    category=getattr(item, "category", None),
                ))
    return items


def taste_texts(items: Optional[List[Any]]) -> List[str]:
    """Flatten likes/dislikes to display strings regardless of payload shape."""
    return [item.text for item in coerce_taste_items(items or [])]


class FamilyMember(BaseModel):
    """A single family member with their taste profile."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nickname: str
    generation: GenerationLabel
    avatar_emoji: str = "👤"
    liked_items: List[TasteItem] = Field(default_factory=list)
    disliked_items: List[TasteItem] = Field(default_factory=list)

    @field_validator("liked_items", "disliked_items", mode="before")
    @classmethod
    def _coerce_taste_fields(cls, value: Any) -> List[TasteItem]:
        return coerce_taste_items(value)


class Preference(BaseModel):
    """A raw preference text input from a user."""
    raw_text: str
    intended_category: Category


class ResolvedEntity(BaseModel):
    """An entity resolved via Qloo search."""
    qloo_id: str
    name: str
    type: str                                   # e.g. "movie", "restaurant", "cuisine"
    confidence: ConfidenceLevel
    user_confirmed: bool = False
    tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None


class Constraints(BaseModel):
    """Family-level constraints for filtering recommendations."""
    budget_band: BudgetBand = BudgetBand.ANY
    location: Optional[str] = None              # city name or "at_home"
    time_available: TimeAvailable = TimeAvailable.ANY
    energy_level: EnergyLevel = EnergyLevel.ANY
    dietary: List[str] = Field(default_factory=list)
    mobility_notes: Optional[str] = None
    category: Category = Category.MOVIES


# ─── Candidate Pool (Person A → Person B handoff) ───────────────────────────

class PersonScore(BaseModel):
    """One person's affinity score for a candidate."""
    member_id: str
    nickname: str
    score: float                               # normalized 0–1
    source: ScoreSource = ScoreSource.REAL


class Candidate(BaseModel):
    """A single recommendation candidate from the retrieval stage."""
    entity: ResolvedEntity
    source_members: List[str] = Field(default_factory=list)   # member IDs
    per_person_scores: Dict[str, PersonScore] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    data_source: DataSource = DataSource.LIVE_QLOO


class CandidatePool(BaseModel):
    """The handoff object from Person A to Person B."""
    candidates: List[Candidate]
    members: List[FamilyMember]
    family_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: Category = Category.MOVIES
    constraints: Constraints = Field(default_factory=Constraints)
    version: str = "1.0"


# ─── Person B Output Models ─────────────────────────────────────────────────

class ConstraintResult(BaseModel):
    """Result of applying one constraint to a candidate."""
    constraint_name: str
    constraint_type: ConstraintType
    status: ConstraintStatus
    message: Optional[str] = None


class PersonExplanation(BaseModel):
    """Why a specific member might enjoy a candidate."""
    member_id: str
    nickname: str
    avatar_emoji: str = "👤"
    score: float
    reason: str
    related_liked_items: List[str] = Field(default_factory=list)


class ScoredCandidate(BaseModel):
    """A fully scored, constrained, and explained candidate."""
    entity: ResolvedEntity
    group_score: float
    per_person_scores: Dict[str, float] = Field(default_factory=dict)
    per_person_details: List[PersonExplanation] = Field(default_factory=list)
    weakest_member_id: str = ""
    weakest_member_nickname: str = ""
    weakest_score: float = 0.0
    bridge_themes: List[str] = Field(default_factory=list)
    group_explanation: str = ""
    constraint_results: List[ConstraintResult] = Field(default_factory=list)
    confidence_note: str = ""
    data_source: DataSource = DataSource.LIVE_QLOO
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RankedResults(BaseModel):
    """The final output: ranked, constrained, explained results."""
    results: List[ScoredCandidate]
    family_id: str
    category: Category
    total_candidates_considered: int
    total_after_constraints: int
    scoring_params: Dict[str, float] = Field(default_factory=dict)
    version: str = "1.0"


# ─── Feedback Models ────────────────────────────────────────────────────────

class Feedback(BaseModel):
    """A single piece of feedback on a candidate."""
    candidate_id: str                          # qloo_id
    candidate_name: str = ""
    reaction: ReactionType
    reason: Optional[str] = None


class AdjustmentSet(BaseModel):
    """Structured changes derived from feedback, fed back into the pipeline."""
    excluded_candidates: List[str] = Field(default_factory=list)
    additional_seeds: List[str] = Field(default_factory=list)
    diversity_penalty_change: float = 0.0
    filter_changes: Dict[str, str] = Field(default_factory=dict)
    feedback_summary: str = ""
    version: str = "1.0"


# ─── Progress Events (SSE) ──────────────────────────────────────────────────

class ProgressEvent(BaseModel):
    """Emitted during pipeline execution for the agent trace UI."""
    step: str
    status: str                                # "started", "in_progress", "completed", "error"
    message: str
    progress: Optional[float] = None           # 0–1
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None


# ─── Error Format ────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """Standardized error response."""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    status_code: int = 500


# ─── Request Models ─────────────────────────────────────────────────────────

class FamilyProfileRequest(BaseModel):
    """What the UI sends to kick off the pipeline."""
    family_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    members: List[FamilyMember]
    constraints: Constraints = Field(default_factory=Constraints)
    category: Category = Category.MOVIES


class RecommendRequest(BaseModel):
    """Full recommendation request, optionally with prior feedback."""
    family_profile: FamilyProfileRequest
    adjustment: Optional[AdjustmentSet] = None


class FeedbackRequest(BaseModel):
    """Feedback submission from the UI."""
    family_id: str
    feedback: List[Feedback]
    previous_results: Any = Field(default_factory=list)
