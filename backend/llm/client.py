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
import re
from typing import Any, Dict, List, Optional

from backend.config import get_settings

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL | re.IGNORECASE)


def extract_text_from_message(message: Any) -> Optional[str]:
    """Pull usable text from a chat-completion message, including empty-content cases."""
    if message is None:
        return None

    content = getattr(message, "content", None)
    text = _coerce_content_to_text(content)
    if text:
        return text

    parsed = getattr(message, "parsed", None)
    if parsed is not None:
        if isinstance(parsed, (dict, list)):
            return json.dumps(parsed)
        text = _coerce_content_to_text(parsed)
        if text:
            return text

    refusal = getattr(message, "refusal", None)
    if isinstance(refusal, str) and refusal.strip():
        return None

    return None


def _coerce_content_to_text(content: Any) -> Optional[str]:
    if content is None:
        return None
    if isinstance(content, str):
        stripped = content.strip()
        return stripped or None
    if isinstance(content, (dict, list)) and not isinstance(content, str):
        if isinstance(content, dict):
            for key in ("text", "content", "json"):
                inner = content.get(key)
                text = _coerce_content_to_text(inner)
                if text:
                    return text
            try:
                return json.dumps(content)
            except (TypeError, ValueError):
                return None
        parts: List[str] = []
        for part in content:
            text = _coerce_content_to_text(part)
            if text:
                parts.append(text)
        joined = "\n".join(parts).strip()
        return joined or None
    return str(content).strip() or None


def parse_json_text(raw: Optional[str]) -> Any:
    """Parse JSON from an LLM string, including fenced markdown."""
    if raw is None:
        raise ValueError("LLM returned empty content")
    text = raw.strip()
    fenced = _FENCE_RE.search(text)
    if fenced:
        text = fenced.group(1).strip()
    return json.loads(text)


def extract_json_from_message(message: Any) -> Any:
    """Parse JSON from a chat message. Raises if content is missing or invalid."""
    parsed = getattr(message, "parsed", None)
    if isinstance(parsed, (dict, list)):
        return parsed
    return parse_json_text(extract_text_from_message(message))


async def complete_json(
    messages: List[Dict[str, str]],
    *,
    temperature: float,
    max_tokens: int,
    force_json_object: bool = True,
) -> Any:
    """
    Call the configured chat model and parse JSON.

    Some providers accept the request with json_object mode but still return
    a null `content` field. In that case we retry once without response_format.
    """
    client = get_openai_client()
    settings = get_settings()
    kwargs: Dict[str, Any] = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if force_json_object:
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    message = response.choices[0].message if response.choices else None
    try:
        return extract_json_from_message(message)
    except (TypeError, ValueError, json.JSONDecodeError):
        if not force_json_object:
            raise
        logger.info("Retrying LLM call without json_object response_format")
        return await complete_json(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
            force_json_object=False,
        )


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

EXPAND_PREFERENCE_PROMPT = """You are a cultural entity search assistant for Qloo.
A family member entered a preference for: "{preference_text}" in the category "{category}".
Only suggest entities that belong to the same category ({category}). Qloo's search indexes specific titles, venues, artists, and places relevant to that domain.
Avoid cross-domain suggestions (e.g., don't suggest movies for a cafe query).

Give 2 to 3 specific, canonical entity names that are strongly associated with this exact preference and fit the category.
Return ONLY valid JSON in this format:
{{
  "expanded_queries": ["Specific Name 1", "Specific Name 2", "Specific Name 3"]
}}
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

    try:
        prompt = EXPAND_PREFERENCE_PROMPT.format(
            preference_text=preference_text,
            category=category,
        )

        data = await complete_json(
            [{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=150,
        )
        queries = data.get("expanded_queries", []) if isinstance(data, dict) else []
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

    try:
        prompt = CONSTRAINT_EVAL_PROMPT.format(
            name=name,
            entity_type=entity_type,
            tags=", ".join(tags[:10]) if tags else "None",
            constraint_name=constraint_name,
            constraint_value=str(constraint_value),
        )

        data = await complete_json(
            [{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=100,
        )
        if not isinstance(data, dict):
            return None
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

    try:
        members_summary = []
        for m in members:
            raw_likes = m.get("liked_items", [])[:3]
            like_labels = []
            for item in raw_likes:
                if isinstance(item, str):
                    like_labels.append(item)
                elif isinstance(item, dict):
                    like_labels.append(str(item.get("text") or item))
                else:
                    like_labels.append(str(getattr(item, "text", item)))
            likes = ", ".join(like_labels)
            members_summary.append(f"- {m.get('nickname')} ({m.get('generation')}): likes {likes}")

        prompt = BRIDGE_THEMES_PROMPT.format(
            name=candidate_name,
            tags=", ".join(candidate_tags[:8]),
            members_taste="\n".join(members_summary),
        )

        data = await complete_json(
            [{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=100,
        )
        themes = data.get("bridge_themes", []) if isinstance(data, dict) else []
        if isinstance(themes, list):
            return [str(t).strip() for t in themes if t][:3]
    except Exception as e:
        logger.warning(f"LLM bridge discovery failed for {candidate_name}: {e}")

    return []

