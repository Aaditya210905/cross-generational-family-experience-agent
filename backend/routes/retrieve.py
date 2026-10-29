"""
Retrieval route.

Builds the candidate pool from resolved profiles.
Person A owns this route.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from backend.models.entities import ResolvedProfile
from backend.models.candidates import CandidatePool
from backend.models.common import AdjustmentSet
from backend.retrieval.engine import RetrievalEngine

router = APIRouter(prefix="/api", tags=["retrieval"])


class RetrieveRequest(BaseModel):
    """Request body for building the candidate pool."""
    profile: ResolvedProfile = Field(..., description="Resolved family profile")
    category: str = Field(..., description="Recommendation category")
    location: Optional[str] = Field(default=None, description="Optional location for places")
    adjustment: Optional[AdjustmentSet] = Field(
        default=None,
        description="Feedback adjustments from a previous round",
    )


@router.post("/retrieve", response_model=CandidatePool)
async def retrieve_candidates(request: RetrieveRequest):
    """
    Build the candidate pool for a resolved family profile.

    This runs per-person and combined Qloo Insights queries,
    merges and deduplicates results, fills in missing scores,
    and normalizes everything to 0-1.

    Returns the CandidatePool — the key handoff object to Person B's
    ranking and constraint engine.
    """
    try:
        engine = RetrievalEngine()
        pool = await engine.build_candidate_pool(
            profile=request.profile,
            category=request.category,
            location=request.location,
            adjustment=request.adjustment,
        )
        return pool

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "retrieval_failed",
                "message": f"Failed to build candidate pool: {str(e)}",
            },
        )
