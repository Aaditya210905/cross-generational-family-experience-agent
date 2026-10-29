"""
Candidate pool data contracts.

The CandidatePool is the KEY HANDOFF OBJECT between Person A and Person B.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ScoreSource(str, Enum):
    """How a per-person score was obtained."""
    DIRECT = "direct"           # From a direct Qloo Insights query for this person
    COMBINED = "combined"       # From the combined all-family query
    IMPUTED_RANK = "imputed_rank"   # Estimated from rank position
    IMPUTED_TAGS = "imputed_tags"   # Estimated from tag overlap
    MISSING = "missing"         # Could not determine a score


class DataSource(str, Enum):
    """Where the candidate data came from."""
    LIVE_QLOO = "live"      # Fresh Qloo API response
    CACHED_QLOO = "cached"  # Cached Qloo response
    FALLBACK = "fallback"   # Fallback/mock data


class CandidateScore(BaseModel):
    """A single person's score for a candidate."""
    member_id: str = Field(..., description="References FamilyMember.id")
    score: float = Field(..., description="Normalized score (0-1)", ge=0.0, le=1.0)
    source: ScoreSource = Field(..., description="How this score was obtained")
    rank: Optional[int] = Field(
        default=None,
        description="Original rank in this person's result list (if applicable)",
    )


class Candidate(BaseModel):
    """A single recommendation candidate with per-person scores."""
    entity_id: str = Field(..., description="Qloo entity ID")
    name: str = Field(..., description="Entity display name")
    entity_type: str = Field(..., description="Qloo entity type")
    tags: list[str] = Field(default_factory=list, description="Tags/genres from Qloo")
    properties: dict = Field(
        default_factory=dict,
        description="Additional metadata (location, price_level, runtime, etc.)",
    )
    per_person_scores: list[CandidateScore] = Field(
        ...,
        description="Score for each family member",
    )
    source_members: list[str] = Field(
        default_factory=list,
        description="Which member(s)' queries surfaced this candidate",
    )
    data_source: DataSource = Field(
        default=DataSource.LIVE_QLOO,
        description="Where this data came from",
    )
    affinity: Optional[float] = Field(
        default=None,
        description="Raw Qloo affinity score (before normalization)",
    )


class CandidatePool(BaseModel):
    """
    The complete candidate pool — Person A's output, Person B's input.
    
    This is the key handoff object between the two halves of the pipeline.
    """
    candidates: list[Candidate] = Field(
        default_factory=list,
        description="All deduplicated candidates with per-person scores",
    )
    category: str = Field(..., description="The recommendation category")
    member_ids: list[str] = Field(
        ...,
        description="List of family member IDs in this pool",
    )
    pool_stats: dict = Field(
        default_factory=dict,
        description="Stats: total candidates, per-person query counts, combined query count, cache hits",
    )
    data_source: DataSource = Field(
        default=DataSource.LIVE_QLOO,
        description="Primary data source for this pool",
    )
