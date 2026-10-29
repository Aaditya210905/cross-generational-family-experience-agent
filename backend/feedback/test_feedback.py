"""
FusionAI — Feedback Handler Tests

Tests user feedback processing:
- LIKE adds candidate to additional seeds
- DISLIKE excludes candidate from subsequent cycles
- TOO_SIMILAR increases diversity penalty
- Free text reason keyword fallback parses energy, budget, mood, time
- Batch feedback processing creates accurate AdjustmentSet
"""

import pytest
from contracts.models import (
    AdjustmentSet,
    Feedback,
    FeedbackRequest,
    ReactionType,
)
from backend.feedback.handler import FeedbackHandler


@pytest.mark.asyncio
async def test_dislike_excludes_candidate():
    handler = FeedbackHandler()
    request = FeedbackRequest(
        family_id="fam1",
        feedback=[
            Feedback(
                candidate_id="m123",
                candidate_name="Scary Movie",
                reaction=ReactionType.DISLIKE,
            )
        ],
    )
    adjustments = await handler.process_feedback(request)
    assert "m123" in adjustments.excluded_candidates
    assert "Excluded 'Scary Movie'" in adjustments.feedback_summary


@pytest.mark.asyncio
async def test_like_adds_seed():
    handler = FeedbackHandler()
    request = FeedbackRequest(
        family_id="fam1",
        feedback=[
            Feedback(
                candidate_id="m456",
                candidate_name="Spirited Away",
                reaction=ReactionType.LIKE,
            )
        ],
    )
    adjustments = await handler.process_feedback(request)
    assert "m456" in adjustments.additional_seeds
    assert "Boosting items similar to 'Spirited Away'" in adjustments.feedback_summary


@pytest.mark.asyncio
async def test_too_similar_increases_diversity_penalty():
    handler = FeedbackHandler()
    request = FeedbackRequest(
        family_id="fam1",
        feedback=[
            Feedback(
                candidate_id="m789",
                candidate_name="Another Marvel Movie",
                reaction=ReactionType.TOO_SIMILAR,
            )
        ],
    )
    adjustments = await handler.process_feedback(request)
    assert adjustments.diversity_penalty_change >= 0.1
    assert "Increasing variety in results" in adjustments.feedback_summary


@pytest.mark.asyncio
async def test_free_text_keyword_parsing():
    handler = FeedbackHandler()
    request = FeedbackRequest(
        family_id="fam1",
        feedback=[
            Feedback(
                candidate_id="m101",
                candidate_name="Action Hero",
                reaction=ReactionType.DISLIKE,
                reason="We want something funnier, cheaper, and less intense",
            )
        ],
    )
    adjustments = await handler.process_feedback(request)
    assert "m101" in adjustments.excluded_candidates
    assert adjustments.filter_changes.get("mood") == "funnier"
    assert adjustments.filter_changes.get("budget") == "lower"
    assert adjustments.filter_changes.get("energy") == "lower"


@pytest.mark.asyncio
async def test_batch_mixed_feedback():
    existing = AdjustmentSet(excluded_candidates=["old_ex"])
    handler = FeedbackHandler(existing_adjustments=existing)
    request = FeedbackRequest(
        family_id="fam1",
        feedback=[
            Feedback(candidate_id="m1", candidate_name="Film A", reaction=ReactionType.LIKE),
            Feedback(candidate_id="m2", candidate_name="Film B", reaction=ReactionType.DISLIKE),
            Feedback(candidate_id="m3", candidate_name="Film C", reaction=ReactionType.TOO_SIMILAR),
        ],
    )
    adjustments = await handler.process_feedback(request)
    assert "old_ex" in adjustments.excluded_candidates
    assert "m2" in adjustments.excluded_candidates
    assert "m1" in adjustments.additional_seeds
    assert adjustments.diversity_penalty_change >= 0.1
