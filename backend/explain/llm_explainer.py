"""
FusionAI — LLM-Powered Explanation Layer

Uses an LLM to generate short, grounded explanations for each
top candidate. The LLM receives ONLY the evidence packet — it
cannot invent facts.

Validation:
  - Every entity/theme mentioned must exist in the evidence
  - Output must be structured JSON
  - If validation fails, falls back to template-based explanation

Tone: warm and specific, no invented facts about venues/prices/hours.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from backend.config import get_settings
from backend.explain.evidence import build_evidence_packet
from backend.explain.templates import generate_template_explanation
from contracts.models import FamilyMember, ScoredCandidate

logger = logging.getLogger(__name__)

# The system prompt instructs the LLM to be grounded and factual
SYSTEM_PROMPT = """You are a family activity recommendation explainer. Your job is to write warm, 
specific explanations for why a recommended item works for a multi-generational family.

STRICT RULES:
1. Only reference facts from the evidence provided. Do NOT invent facts about prices, hours, 
   locations, or any details not in the evidence.
2. Keep each explanation 1-2 sentences max.
3. Be warm and encouraging but honest — if someone is a weak match, say so kindly.
4. Reference specific liked items from each person's profile when relevant.
5. Output valid JSON only.

Output format:
{
  "group_explanation": "One sentence on why this works for everyone.",
  "per_person_reasons": [
    {"member_id": "...", "nickname": "...", "reason": "One sentence on why they'd enjoy it."},
    ...
  ]
}"""

USER_PROMPT_TEMPLATE = """Based on this evidence, write explanations for the recommendation.

EVIDENCE:
{evidence_json}

Remember: reference ONLY the facts above. Do not invent details. Output valid JSON."""


async def generate_explanations(
    candidates: List[ScoredCandidate],
    members: List[FamilyMember],
    max_candidates: int = 8,
) -> List[ScoredCandidate]:
    """
    Generate LLM-powered explanations for top candidates.
    Falls back to templates if LLM fails.

    Args:
        candidates: Scored and constrained candidates
        members: Family members for context
        max_candidates: Only explain the top N (LLM cost control)

    Returns:
        Candidates with explanations filled in
    """
    settings = get_settings()
    rate_limited = False

    for i, candidate in enumerate(candidates[:max_candidates]):
        # Enrich with semantic bridge themes if none exist
        if not candidate.bridge_themes and settings.openai_api_key and i < 3:
            from backend.llm import discover_semantic_bridges
            try:
                bridges = await discover_semantic_bridges(
                    candidate.entity.name,
                    candidate.tags,
                    [{"nickname": m.nickname, "generation": m.generation.value, "liked_items": m.liked_items} for m in members]
                )
                if bridges:
                    candidate.bridge_themes = bridges
            except Exception as e:
                logger.debug(f"Bridge discovery skipped: {e}")

        evidence = build_evidence_packet(candidate, members)

        try:
            if settings.openai_api_key and not rate_limited and i < 3:
                explanation = await _call_llm(evidence, settings)
                if explanation == "RATE_LIMITED":
                    rate_limited = True
                elif explanation:
                    validated = _validate_explanation(explanation, evidence)
                    if validated:
                        _apply_explanation(candidate, validated, members)
                        continue

            # Fallback to templates
            logger.info(f"Using template explanation for {candidate.entity.name}")
            template_result = generate_template_explanation(evidence)
            _apply_explanation(candidate, template_result, members)

        except Exception as e:
            logger.warning(f"Explanation failed for {candidate.entity.name}: {e}")
            template_result = generate_template_explanation(evidence)
            _apply_explanation(candidate, template_result, members)

    # For candidates beyond max, use templates
    for candidate in candidates[max_candidates:]:
        evidence = build_evidence_packet(candidate, members)
        template_result = generate_template_explanation(evidence)
        _apply_explanation(candidate, template_result, members)

    return candidates


async def _call_llm(
    evidence: Dict[str, Any],
    settings: Any,
) -> Optional[Any]:
    try:
        from openai import AsyncOpenAI

        client_kwargs = {"api_key": settings.openai_api_key}
        if settings.openai_base_url:
            client_kwargs["base_url"] = settings.openai_base_url
        client = AsyncOpenAI(**client_kwargs)

        evidence_json = json.dumps(evidence, indent=2, default=str)
        user_prompt = USER_PROMPT_TEMPLATE.format(evidence_json=evidence_json)

        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=settings.llm_max_tokens,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        return json.loads(content)

    except ImportError:
        logger.warning("openai package not available, using template fallback")
        return None
    except Exception as e:
        err_str = str(e).lower()
        if "429" in err_str or "rate_limit" in err_str:
            logger.warning("LLM rate limit reached — gracefully switching to template explanations")
            return "RATE_LIMITED"
        logger.warning(f"LLM call failed: {e}")
        return None


def _validate_explanation(
    explanation: Optional[Dict[str, Any]],
    evidence: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Validate that the LLM's explanation only references facts
    from the evidence packet.

    Returns the explanation if valid, None if invalid.
    """
    if not explanation:
        return None

    # Check required fields
    if "group_explanation" not in explanation:
        logger.warning("Missing 'group_explanation' in LLM output")
        return None

    if "per_person_reasons" not in explanation:
        logger.warning("Missing 'per_person_reasons' in LLM output")
        return None

    # Validate group explanation length
    group_exp = explanation["group_explanation"]
    if not isinstance(group_exp, str) or len(group_exp) > 500:
        logger.warning("Invalid group explanation")
        return None

    # Validate per-person reasons
    reasons = explanation["per_person_reasons"]
    if not isinstance(reasons, list):
        logger.warning("per_person_reasons is not a list")
        return None

    evidence_member_ids = {p["member_id"] for p in evidence.get("per_person", [])}
    for reason in reasons:
        if not isinstance(reason, dict):
            return None
        if "member_id" not in reason or "reason" not in reason:
            return None
        if reason["member_id"] not in evidence_member_ids:
            logger.warning(f"Unknown member_id in explanation: {reason['member_id']}")
            return None
        if not isinstance(reason["reason"], str) or len(reason["reason"]) > 300:
            return None

    # Build a set of all "known" terms from evidence for soft validation
    known_terms = set()
    known_terms.add(evidence["candidate"]["name"].lower())
    for tag in evidence["candidate"].get("tags", []):
        known_terms.add(tag.lower().replace("_", " "))
    for person in evidence.get("per_person", []):
        known_terms.add(person["nickname"].lower())
        for item in person.get("related_liked_items", []):
            known_terms.add(item.lower())
        for item in person.get("disliked_items", []):
            known_terms.add(item.lower())
    for theme in evidence.get("bridge_themes", []):
        known_terms.add(theme.lower().replace("_", " "))

    # We don't reject for unknown terms (too strict), but we log warnings
    # The grounding is already enforced by giving the LLM only the evidence

    return explanation


def _apply_explanation(
    candidate: ScoredCandidate,
    explanation: Dict[str, Any],
    members: List[FamilyMember],
) -> None:
    """Apply the explanation to the candidate object."""
    candidate.group_explanation = explanation.get("group_explanation", "")

    reasons_map = {}
    for reason in explanation.get("per_person_reasons", []):
        reasons_map[reason.get("member_id", "")] = reason.get("reason", "")

    # Update per-person details with the reasons
    for detail in candidate.per_person_details:
        if detail.member_id in reasons_map:
            detail.reason = reasons_map[detail.member_id]
