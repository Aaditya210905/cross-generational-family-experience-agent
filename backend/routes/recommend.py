"""
FusionAI — Recommendation Route (Person B)

POST /api/recommend — Full pipeline: rank → constrain → explain
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.pipeline.orchestrator import get_orchestrator
from contracts.models import (
    AdjustmentSet,
    ErrorResponse,
    RankedResults,
    RecommendRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["recommendations"])


@router.post(
    "/recommend",
    response_model=RankedResults,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def recommend(request: RecommendRequest) -> RankedResults:
    """
    Generate recommendations for a family.

    Runs the full pipeline:
    1. Resolve preferences (Person A stub)
    2. Retrieve candidates (Person A stub)
    3. Apply feedback adjustments
    4. Group ranking
    5. Constraint filtering
    6. Generate explanations
    """
    try:
        profile = request.family_profile

        if not profile.members:
            raise HTTPException(
                status_code=400,
                detail="At least one family member is required",
            )

        if len(profile.members) > 6:
            raise HTTPException(
                status_code=400,
                detail="Maximum 6 family members supported",
            )

        orchestrator = get_orchestrator()
        results = await orchestrator.run(
            members=profile.members,
            constraints=profile.constraints,
            category=profile.category,
            family_id=profile.family_id,
            adjustment=request.adjustment,
            confirmed_entity_ids=profile.confirmed_entity_ids,
        )

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Recommendation pipeline failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation pipeline failed: {str(e)}",
        )
