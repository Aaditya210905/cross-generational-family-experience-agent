"""
FusionAI — Template-Based Fallback Explanations

These templates generate explanations WITHOUT an LLM.
Used when:
  1. The LLM fails or times out
  2. The LLM response fails validation
  3. We're in offline/demo mode

Templates are warm, specific, and never invent facts about
venues, prices, or opening hours.
"""

from __future__ import annotations

from typing import Any, Dict, List


def generate_template_explanation(
    evidence: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generate a structured explanation from an evidence packet
    using templates only — no LLM needed.

    Returns the same structure as the LLM would:
    {
        "group_explanation": "...",
        "per_person_reasons": [
            {"member_id": "...", "nickname": "...", "reason": "..."},
            ...
        ]
    }
    """
    candidate = evidence["candidate"]
    per_person = evidence["per_person"]
    bridge_themes = evidence.get("bridge_themes", [])
    weakest = evidence.get("weakest_member", {})

    # ── Group explanation ────────────────────────────────────────────────
    name = candidate["name"]
    tags_str = _format_tags(candidate["tags"][:4])
    group_score = candidate["group_score"]

    parts = [f"{name} works for the whole family"]

    if bridge_themes:
        themes_str = _format_tags(bridge_themes[:3])
        parts.append(f"because it bridges shared interests in {themes_str}")
    elif tags_str:
        parts.append(f"with its blend of {tags_str}")

    score_label = _group_label(group_score)
    parts.append(f"({score_label} group match)")

    if weakest.get("nickname"):
        w_score = weakest.get("score", 0)
        if w_score < 0.4:
            parts.append(
                f"— though {weakest['nickname']} might be less enthusiastic"
            )

    group_explanation = " ".join(parts) + "."

    # ── Per-person reasons ───────────────────────────────────────────────
    per_person_reasons = []
    for person in per_person:
        reason = _build_person_reason(person, candidate)
        per_person_reasons.append({
            "member_id": person["member_id"],
            "nickname": person["nickname"],
            "reason": reason,
        })

    return {
        "group_explanation": group_explanation,
        "per_person_reasons": per_person_reasons,
    }


def _build_person_reason(
    person: Dict[str, Any],
    candidate: Dict[str, Any],
) -> str:
    """Build a reason for why a specific person might enjoy this candidate."""
    nickname = person["nickname"]
    score = person["score"]
    score_label = person.get("score_label", _person_label(score))
    related = person.get("related_liked_items", [])
    generation = person.get("generation", "")

    parts = []

    if related:
        items_str = _format_items(related[:3])
        if score >= 0.7:
            parts.append(f"Since {nickname} enjoys {items_str}, this should be a great fit")
        elif score >= 0.4:
            parts.append(f"Given {nickname}'s interest in {items_str}, this could be enjoyable")
        else:
            parts.append(f"While {nickname} likes {items_str}, this may not be their top pick")
    else:
        tags = candidate.get("tags", [])[:3]
        tags_str = _format_tags(tags) if tags else "this genre"
        if score >= 0.7:
            parts.append(f"{nickname} should enjoy the {tags_str} elements")
        elif score >= 0.4:
            parts.append(f"{nickname} may appreciate the {tags_str} aspects")
        else:
            parts.append(f"This might be outside {nickname}'s usual preferences")

    parts.append(f"({score_label})")

    return " ".join(parts) + "."


def _format_tags(tags: List[str]) -> str:
    """Format a list of tags into a readable string."""
    clean = [t.replace("_", " ").replace("-", " ") for t in tags]
    if len(clean) == 0:
        return ""
    elif len(clean) == 1:
        return clean[0]
    elif len(clean) == 2:
        return f"{clean[0]} and {clean[1]}"
    else:
        return ", ".join(clean[:-1]) + f", and {clean[-1]}"


def _format_items(items: List[str]) -> str:
    """Format a list of items into a readable string."""
    if len(items) == 0:
        return ""
    elif len(items) == 1:
        return items[0]
    elif len(items) == 2:
        return f"{items[0]} and {items[1]}"
    else:
        return ", ".join(items[:-1]) + f", and {items[-1]}"


def _group_label(score: float) -> str:
    """Label for overall group score."""
    if score >= 0.80:
        return "excellent"
    elif score >= 0.65:
        return "strong"
    elif score >= 0.50:
        return "good"
    elif score >= 0.35:
        return "fair"
    else:
        return "weak"


def _person_label(score: float) -> str:
    """Label for individual person score."""
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
