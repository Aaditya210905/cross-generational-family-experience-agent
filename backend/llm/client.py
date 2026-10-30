"""
FusionAI — Central LLM Service

Provides structured, grounded LLM utilities to empower Qloo:
1. Preference Query Expansion (turns natural language like "Bollywood classics" into concrete Qloo search targets)
2. Semantic Constraint Evaluation (evaluates ambiguous constraints when static tags are missing)
3. Semantic Bridge Discovery (identifies cross-generational cultural bridges)
4. Free-text Feedback Parsing (translates conversational steering into structured filters)

All calls have deterministic fallbacks so the app never breaks if LLM is unavailable.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from backend.config import get_settings

logger = logging.getLogger(__name__)


def is_llm_available() -> bool:
    """Check if LLM is configured with an API key."""
    settings = get_settings()
    return bool(settings.openai_api_key)


def get_openai_client():
    """Create an AsyncOpenAI client configured for OpenAI, Groq, Gemini, etc."""
    from openai import AsyncOpenAI

    settings = get_settings()
    client_kwargs: Dict[str, Any] = {"api_key": settings.openai_api_key}
    if settings.openai_base_url:
        client_kwargs["base_url"] = settings.openai_base_url
    return AsyncOpenAI(**client_kwargs)


# ─── 1. Preference Query Expansion (For Qloo Search) ─────────────────────────

EXPAND_PREFERENCE_PROMPT = """You are a cultural entity search assistant.
A family member entered a preference for: "{preference_text}" in the category "{category}".
Qloo's search engine indexes specific titles, venues, artists, and places (not generic categories).

Give 2 to 3 specific, famous canonical entity titles or names that best represent this preference so we can search for them in Qloo.
Return ONLY valid JSON in this format:
{{
  "expanded_queries": ["Specific Title 1", "Specific Title 2", "Specific Title 3"]
}}

Example: "Bollywood romance classics" -> {{"expanded_queries": ["Dilwale Dulhania Le Jayenge", "Kuch Kuch Hota Hai", "Kabhi Khushi Kabhie Gham"]}}
Example: "Studio Ghibli" -> {{"expanded_queries": ["Spirited Away", "My Neighbor Totoro", "Howl's Moving Castle"]}}
Example: "cozy Italian food" -> {{"expanded_queries": ["Trattoria", "Osteria", "Pasta Bar"]}}
"""

_EXPANSION_CACHE: Dict[str, List[str]] = {}

async def expand_preference_for_qloo(
    preference_text: str,
    category: str,
) -> List[str]:
    """
    Expand a vague or generic preference into 2-3 specific entity queries
    to search Qloo's knowledge base.
    """
    cache_key = f"{category.lower()}:{preference_text.strip().lower()}"
    if cache_key in _EXPANSION_CACHE:
        return _EXPANSION_CACHE[cache_key]

    if not is_llm_available():
        return [preference_text]

    settings = get_settings()
    try:
        client = get_openai_client()
        prompt = EXPAND_PREFERENCE_PROMPT.format(
            preference_text=preference_text,
            category=category,
        )

        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=150,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        queries = data.get("expanded_queries", [])
        if queries and isinstance(queries, list):
            res_list = [str(q).strip() for q in queries if q]
            if res_list:
                _EXPANSION_CACHE[cache_key] = res_list
                logger.info(f"LLM expanded '{preference_text}' -> {res_list} for Qloo search")
                return res_list
    except Exception as e:
        logger.warning(f"LLM query expansion failed for '{preference_text}': {e}")

    return [preference_text]


# ─── 2. Semantic Constraint Evaluation ───────────────────────────────────────

CONSTRAINT_EVAL_PROMPT = """You are a family safety and accessibility evaluator.
Candidate: "{name}" ({entity_type})
Known Tags/Attributes: {tags}
Constraint to evaluate: {constraint_name} = {constraint_value}

Determine if this activity or place meets the constraint.
Output ONLY valid JSON in this format:
{{
  "status": "pass" or "warning" or "fail",
  "reason": "Brief 1-sentence explanation"
}}
"""

async def evaluate_constraint_with_llm(
    name: str,
    entity_type: str,
    tags: List[str],
    constraint_name: str,
    constraint_value: Any,
) -> Optional[Dict[str, str]]:
    """
    Intelligently evaluate if a candidate satisfies a constraint when static tags are ambiguous.
    """
    if not is_llm_available():
        return None

    settings = get_settings()
    try:
        client = get_openai_client()
        prompt = CONSTRAINT_EVAL_PROMPT.format(
            name=name,
            entity_type=entity_type,
            tags=", ".join(tags[:10]) if tags else "None",
            constraint_name=constraint_name,
            constraint_value=str(constraint_value),
        )

        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=100,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        status = data.get("status", "").lower()
        if status in ("pass", "warning", "fail"):
            return {
                "status": status,
                "reason": data.get("reason", f"Evaluated for {constraint_name}"),
            }
    except Exception as e:
        logger.warning(f"LLM constraint evaluation failed for {name}: {e}")

    return None


# ─── 3. Semantic Cross-Generational Bridge Discovery ─────────────────────────

BRIDGE_THEMES_PROMPT = """You are a cultural taste analyst.
Candidate: "{name}"
Tags: {tags}
Family members and their tastes:
{members_taste}

Identify 1 to 3 short thematic "bridge themes" (2-3 words each) that connect the different generations in this family to this candidate.
Output ONLY valid JSON:
{{
  "bridge_themes": ["Theme One", "Theme Two"]
}}
"""

async def discover_semantic_bridges(
    candidate_name: str,
    candidate_tags: List[str],
    members: List[Dict[str, Any]],
) -> List[str]:
    """
    Identify cross-generational cultural bridges connecting family members to this candidate.
    """
    if not is_llm_available() or not members:
        return []

    settings = get_settings()
    try:
        client = get_openai_client()
        members_summary = []
        for m in members:
            likes = ", ".join(m.get("liked_items", [])[:3])
            members_summary.append(f"- {m.get('nickname')} ({m.get('generation')}): likes {likes}")

        prompt = BRIDGE_THEMES_PROMPT.format(
            name=candidate_name,
            tags=", ".join(candidate_tags[:8]),
            members_taste="\n".join(members_summary),
        )

        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=100,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        themes = data.get("bridge_themes", [])
        if isinstance(themes, list):
            return [str(t).strip() for t in themes if t][:3]
    except Exception as e:
        logger.warning(f"LLM bridge discovery failed for {candidate_name}: {e}")

    return []

