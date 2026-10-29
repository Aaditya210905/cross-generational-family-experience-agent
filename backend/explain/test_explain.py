"""
FusionAI — Explanation Layer Tests

Tests grounding and explanation generation:
- Evidence packet builder extracts factual overlap
- Template explainer produces warm, grounded explanations
- LLM output validator validates against evidence member IDs
- Fallback path works gracefully when LLM is unavailable
"""

import pytest
from contracts.models import (
    Category,
    ConfidenceLevel,
    FamilyMember,
    GenerationLabel,
    PersonExplanation,
    ResolvedEntity,
    ScoredCandidate,
)
from backend.explain.evidence import build_evidence_packet
from backend.explain.templates import generate_template_explanation
from backend.explain.llm_explainer import (
    _validate_explanation,
    generate_explanations,
)


@pytest.fixture
def sample_members():
    return [
        FamilyMember(
            id="m_nani",
            nickname="Nani",
            generation=GenerationLabel.GRANDPARENT,
            liked_items=["Bollywood", "Family dramas"],
            disliked_items=["Horror"],
        ),
        FamilyMember(
            id="m_arjun",
            nickname="Arjun",
            generation=GenerationLabel.TEEN,
            liked_items=["Anime", "Studio Ghibli"],
            disliked_items=["Romance"],
        ),
    ]


@pytest.fixture
def sample_candidate():
    resolved = ResolvedEntity(
        qloo_id="ghibli_1",
        name="Spirited Away",
        type="movie",
        confidence=ConfidenceLevel.EXACT,
        tags=["anime", "family drama", "fantasy"],
    )
    return ScoredCandidate(
        entity=resolved,
        group_score=0.88,
        per_person_scores={"m_nani": 0.82, "m_arjun": 0.94},
        per_person_details=[
            PersonExplanation(
                member_id="m_nani",
                nickname="Nani",
                score=0.82,
                reason="",
            ),
            PersonExplanation(
                member_id="m_arjun",
                nickname="Arjun",
                score=0.94,
                reason="",
            ),
        ],
        bridge_themes=["family drama", "anime"],
        weakest_member_id="m_nani",
        weakest_member_nickname="Nani",
        weakest_score=0.82,
        tags=["anime", "family drama", "fantasy"],
    )


def test_build_evidence_packet(sample_candidate, sample_members):
    packet = build_evidence_packet(sample_candidate, sample_members)

    assert packet["candidate"]["name"] == "Spirited Away"
    assert len(packet["per_person"]) == 2
    assert packet["weakest_member"]["nickname"] == "Nani"
    assert "family drama" in packet["bridge_themes"]

    # Check that Arjun's related item 'Anime' was matched
    arjun_ev = next(p for p in packet["per_person"] if p["member_id"] == "m_arjun")
    assert any("Anime" in item or "anime" in item.lower() for item in arjun_ev["related_liked_items"])


def test_generate_template_explanation(sample_candidate, sample_members):
    packet = build_evidence_packet(sample_candidate, sample_members)
    result = generate_template_explanation(packet)

    assert "group_explanation" in result
    assert "Spirited Away" in result["group_explanation"]
    assert len(result["per_person_reasons"]) == 2
    assert any("Arjun" in r["reason"] for r in result["per_person_reasons"])
    assert any("Nani" in r["reason"] for r in result["per_person_reasons"])


def test_validate_explanation_passes_valid(sample_candidate, sample_members):
    packet = build_evidence_packet(sample_candidate, sample_members)
    valid_llm_output = {
        "group_explanation": "Spirited Away blends anime artistry with heartfelt family drama.",
        "per_person_reasons": [
            {"member_id": "m_nani", "nickname": "Nani", "reason": "Heartwarming animation for Nani."},
            {"member_id": "m_arjun", "nickname": "Arjun", "reason": "Studio Ghibli masterpiece for Arjun."},
        ],
    }
    validated = _validate_explanation(valid_llm_output, packet)
    assert validated is not None
    assert validated["group_explanation"] == valid_llm_output["group_explanation"]


def test_validate_explanation_rejects_hallucinated_member(sample_candidate, sample_members):
    packet = build_evidence_packet(sample_candidate, sample_members)
    invalid_llm_output = {
        "group_explanation": "Great movie.",
        "per_person_reasons": [
            {"member_id": "unknown_ghost_member", "nickname": "Casper", "reason": "Likes it."},
        ],
    }
    validated = _validate_explanation(invalid_llm_output, packet)
    assert validated is None


@pytest.mark.asyncio
async def test_generate_explanations_fallback(sample_candidate, sample_members):
    # Without API key, generate_explanations automatically uses templates
    candidates = [sample_candidate]
    explained = await generate_explanations(candidates, sample_members)
    assert len(explained) == 1
    assert explained[0].group_explanation != ""
    assert all(d.reason != "" for d in explained[0].per_person_details)
