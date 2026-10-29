"""
FusionAI — Evidence Packet Builder

Builds a structured evidence packet for each top candidate,
containing ONLY factual data that the LLM can reference.
This is the "grounding" layer — the LLM cannot invent facts
that aren't in the evidence.
"""

from __future__ import annotations

from typing import Any, Dict, List, Set

from contracts.models import (
    CandidatePool,
    FamilyMember,
    ScoredCandidate,
)


def build_evidence_packet(
    candidate: ScoredCandidate,
    members: List[FamilyMember],
) -> Dict[str, Any]:
    """
    Build a structured evidence packet for a candidate.

    The packet contains everything the LLM needs to explain
    why this candidate works for the family — and nothing more.
    """
    # Per-person evidence
    per_person_evidence = []
    for detail in candidate.per_person_details:
        member = next((m for m in members if m.id == detail.member_id), None)
        if not member:
            continue

        # Find which of this member's liked items relate to the candidate
        member_liked_lower = {item.lower() for item in member.liked_items}
        candidate_tags_lower = {t.lower() for t in candidate.tags}

        # Direct overlap: member's liked items that appear in tags
        related = []
        for item in member.liked_items:
            item_words = set(item.lower().replace("-", " ").split())
            if item_words & candidate_tags_lower:
                related.append(item)

        # Also check entity name similarity
        entity_name_lower = candidate.entity.name.lower()
        for item in member.liked_items:
            if item.lower() in entity_name_lower or entity_name_lower in item.lower():
                if item not in related:
                    related.append(item)

        per_person_evidence.append({
            "member_id": detail.member_id,
            "nickname": detail.nickname,
            "generation": member.generation.value,
            "score": round(detail.score, 2),
            "score_label": _score_label(detail.score),
            "related_liked_items": related[:5],
            "disliked_items": member.disliked_items[:3],
        })

    # Constraint summary
    constraint_summary = []
    for cr in candidate.constraint_results:
        constraint_summary.append({
            "name": cr.constraint_name,
            "status": cr.status.value,
            "message": cr.message,
        })

    return {
        "candidate": {
            "name": candidate.entity.name,
            "type": candidate.entity.type,
            "tags": candidate.tags[:10],
            "group_score": round(candidate.group_score, 2),
            "metadata": _safe_metadata(candidate.metadata),
        },
        "per_person": per_person_evidence,
        "bridge_themes": candidate.bridge_themes,
        "weakest_member": {
            "nickname": candidate.weakest_member_nickname,
            "score": round(candidate.weakest_score, 2),
        },
        "constraints": constraint_summary,
        "confidence_note": candidate.confidence_note,
    }


def _score_label(score: float) -> str:
    """Convert a 0-1 score to a human-readable label."""
    if score >= 0.80:
        return "strong match"
    elif score >= 0.60:
        return "good match"
    elif score >= 0.40:
        return "moderate match"
    elif score >= 0.20:
        return "weak match"
    else:
        return "poor match"


def _safe_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Filter metadata to only include safe-to-share fields."""
    safe_keys = {
        "runtime_min", "year", "language", "price_level",
        "cuisine", "location", "rating",
    }
    return {k: v for k, v in metadata.items() if k in safe_keys}
