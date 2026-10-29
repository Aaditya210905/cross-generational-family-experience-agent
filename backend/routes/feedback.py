"""
FusionAI — Feedback Route (Person B)

POST /api/feedback — Submit feedback, get adjustment set
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.pipeline.orchestrator import get_orchestrator
from contracts.models import (
    AdjustmentSet,
    ErrorResponse,
    FeedbackRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["feedback"])

# In-memory store for adjustment sets per family
_adjustment_store: dict[str, AdjustmentSet] = {}


@router.post(
    "/feedback",
    response_model=AdjustmentSet,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def submit_feedback(request: FeedbackRequest) -> AdjustmentSet:
    """
    Submit feedback on recommendations.

    Converts reactions into structured adjustments:
    - LIKE → additional seed signal
    - DISLIKE → exclude candidate
    - TOO_SIMILAR → increase diversity
    - Free text → structured adjustment via LLM/keyword parsing
    """
    try:
        if not request.feedback:
            raise HTTPException(
                status_code=400,
                detail="At least one feedback item is required",
            )

        # Get existing adjustments for this family
        existing = _adjustment_store.get(request.family_id)

        orchestrator = get_orchestrator()
        adjustment = await orchestrator.process_feedback(request, existing)

        # Store for next round
        _adjustment_store[request.family_id] = adjustment

        return adjustment

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Feedback processing failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Feedback processing failed: {str(e)}",
        )


@router.get(
    "/feedback/{family_id}",
    response_model=Optional[AdjustmentSet],
)
async def get_adjustments(family_id: str) -> Optional[AdjustmentSet]:
    """Get the current adjustment set for a family."""
    return _adjustment_store.get(family_id)


@router.delete("/feedback/{family_id}")
async def clear_adjustments(family_id: str) -> dict:
    """Clear all adjustments for a family (reset feedback)."""
    _adjustment_store.pop(family_id, None)
    return {"status": "cleared", "family_id": family_id}
