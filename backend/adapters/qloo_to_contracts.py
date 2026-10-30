"""Conversions from backend Qloo transport models to contracts.models.

This is intentionally the only place where Qloo field names (``entity_id``,
``properties``, ``DIRECT``) enter the public recommendation pipeline.
"""
from contracts.models import (
    Candidate, CandidatePool, ConfidenceLevel, Constraints, DataSource,
    FamilyMember, PersonScore, ResolvedEntity, ScoreSource,
)


def _confidence(value: object) -> ConfidenceLevel:
    raw = getattr(value, "value", value)
    return {"high": ConfidenceLevel.EXACT, "medium": ConfidenceLevel.NEAR,
            "low": ConfidenceLevel.AMBIGUOUS}.get(str(raw), ConfidenceLevel.UNRESOLVED)


def _data_source(value: object) -> DataSource:
    raw = str(getattr(value, "value", value))
    return {"live": DataSource.LIVE_QLOO, "cached": DataSource.CACHED_QLOO}.get(raw, DataSource.FALLBACK)


def to_contract_candidate(qloo_candidate, member_lookup: dict[str, FamilyMember], category) -> Candidate:
    """Convert one Qloo retrieval candidate without leaking Qloo schema downstream."""
    scores = {}
    for score in qloo_candidate.per_person_scores:
        member = member_lookup.get(score.member_id)
        source = ScoreSource.REAL if str(getattr(score.source, "value", score.source)) == "direct" else ScoreSource.ESTIMATED
        scores[score.member_id] = PersonScore(
            member_id=score.member_id,
            nickname=member.nickname if member else score.member_id,
            score=score.score,
            source=source,
        )
    entity_type = qloo_candidate.entity_type
    # Qloo uses the generic place type for both venues and attractions.  The
    # retrieval request supplies the authoritative category, so retain that
    # distinction in the canonical contract before deterministic filtering.
    if str(entity_type).lower() in {"place", "urn:entity:place"}:
        category_name = {"movies": "movie", "restaurants": "restaurant", "activities": "activity"}.get(
            str(getattr(category, "value", category)), "venue"
        )
        entity_type = f"{category_name}_place"
    return Candidate(
        entity=ResolvedEntity(
            qloo_id=qloo_candidate.entity_id, name=qloo_candidate.name,
            type=entity_type, confidence=ConfidenceLevel.EXACT,
            tags=qloo_candidate.tags,
        ),
        source_members=qloo_candidate.source_members,
        per_person_scores=scores,
        tags=qloo_candidate.tags,
        metadata=qloo_candidate.properties,
        data_source=_data_source(qloo_candidate.data_source),
    )


def to_contract_pool(qloo_pool, members: list[FamilyMember], constraints: Constraints,
                     family_id: str, category) -> CandidatePool:
    lookup = {member.id: member for member in members}
    return CandidatePool(
        candidates=[to_contract_candidate(c, lookup, category) for c in qloo_pool.candidates],
        members=members, constraints=constraints, family_id=family_id, category=category,
    )
