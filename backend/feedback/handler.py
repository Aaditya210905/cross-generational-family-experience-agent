"""
FusionAI — Feedback Handler

Converts user feedback (like, dislike, too_similar, free text)
into a structured AdjustmentSet that modifies the next
recommendation cycle.

All conversions are deterministic where possible.
Free text is optionally processed by the LLM into structured
adjustments, validated against an allowed list.
"""

from __future__ import annotations

import json
import logging
from typing import Dict, List, Optional, Set

from backend.config import get_settings
from contracts.models import (
    AdjustmentSet,
    Feedback,
    FeedbackRequest,
    ReactionType,
)

logger = logging.getLogger(__name__)

# Allowed structured adjustments from free text
ALLOWED_ADJUSTMENTS = {
    "energy": {"lower", "higher"},
    "budget": {"lower", "higher"},
    "mood": {"lighter", "darker", "funnier", "more_serious"},
    "pace": {"slower", "faster"},
    "genre": set(),  # any genre string is allowed
    "time": {"shorter", "longer"},
}

FREE_TEXT_SYSTEM_PROMPT = """You convert user feedback about recommendations into structured adjustments.

Given a free-text reason, output a JSON object with these optional fields:
- "energy": "lower" or "higher"
- "budget": "lower" or "higher"  
- "mood": "lighter", "darker", "funnier", or "more_serious"
- "pace": "slower" or "faster"
- "time": "shorter" or "longer"

Only include fields that the feedback clearly implies. Output valid JSON only.
Example: "something less intense" → {"energy": "lower", "mood": "lighter"}
Example: "we want something funnier" → {"mood": "funnier"}
Example: "too expensive" → {"budget": "lower"}

If the feedback doesn't map to any adjustment, output: {}"""


class FeedbackHandler:
    """
    Processes feedback and builds an AdjustmentSet.

    Feedback Types:
        LIKE → add entity as additional seed signal
        DISLIKE → exclude candidate, add as negative signal
        TOO_SIMILAR → increase diversity penalty
        Free text → optionally convert to structured adjustments
    """

    def __init__(self, existing_adjustments: Optional[AdjustmentSet] = None):
        self.adjustments = existing_adjustments or AdjustmentSet()

    async def process_feedback(
        self,
        request: FeedbackRequest,
    ) -> AdjustmentSet:
        """
        Process a batch of feedback and return an updated AdjustmentSet.
        """
        changes_summary: List[str] = []

        for fb in request.feedback:
            if fb.reaction == ReactionType.DISLIKE:
                self._handle_dislike(fb, changes_summary)
            elif fb.reaction == ReactionType.LIKE:
                self._handle_like(fb, changes_summary)
            elif fb.reaction == ReactionType.TOO_SIMILAR:
                self._handle_too_similar(fb, changes_summary)

            # Process free text reason if provided
            if fb.reason and fb.reason.strip():
                await self._handle_free_text(fb.reason, changes_summary)

        self.adjustments.feedback_summary = "; ".join(changes_summary)
        return self.adjustments

    def _handle_dislike(self, fb: Feedback, changes: List[str]) -> None:
        """
        Dislike → exclude the candidate, treat it as negative signal.
        """
        if fb.candidate_id not in self.adjustments.excluded_candidates:
            self.adjustments.excluded_candidates.append(fb.candidate_id)
            name = fb.candidate_name or fb.candidate_id
            changes.append(f"Excluded '{name}'")
            logger.info(f"Excluded candidate: {fb.candidate_id}")

    def _handle_like(self, fb: Feedback, changes: List[str]) -> None:
        """
        Like → use as an additional seed signal for next round.
        """
        if fb.candidate_id not in self.adjustments.additional_seeds:
            self.adjustments.additional_seeds.append(fb.candidate_id)
            name = fb.candidate_name or fb.candidate_id
            changes.append(f"Boosting items similar to '{name}'")
            logger.info(f"Added seed: {fb.candidate_id}")

    def _handle_too_similar(self, fb: Feedback, changes: List[str]) -> None:
        """
        Too similar → raise the diversity penalty.
        """
        self.adjustments.diversity_penalty_change += 0.1
        changes.append("Increasing variety in results")
        logger.info(f"Diversity penalty increased by 0.1")

    async def _handle_free_text(self, text: str, changes: List[str]) -> None:
        """
        Convert free text to structured adjustments.
        Uses LLM if available, otherwise tries simple keyword matching.
        """
        settings = get_settings()

        structured = None
        if settings.openai_api_key:
            structured = await self._llm_parse_free_text(text, settings)

        if not structured:
            structured = self._keyword_parse_free_text(text)

        if structured:
            # Validate and apply
            for key, value in structured.items():
                if key in ALLOWED_ADJUSTMENTS:
                    allowed_values = ALLOWED_ADJUSTMENTS[key]
                    if not allowed_values or value in allowed_values:
                        self.adjustments.filter_changes[key] = value
                        changes.append(f"Adjusting {key}: {value}")
                        logger.info(f"Applied adjustment: {key}={value}")

    async def _llm_parse_free_text(
        self, text: str, settings: any,
    ) -> Optional[Dict[str, str]]:
        """Use LLM to convert free text to structured adjustments."""
        try:
            from openai import AsyncOpenAI

            client_kwargs = {"api_key": settings.openai_api_key}
            if settings.openai_base_url:
                client_kwargs["base_url"] = settings.openai_base_url
            client = AsyncOpenAI(**client_kwargs)
            from backend.llm import extract_json_from_message
            response = await client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": FREE_TEXT_SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                temperature=0.1,
                max_tokens=600,
            )
            return extract_json_from_message(response.choices[0].message)
        except Exception as e:
            logger.warning(f"LLM free text parsing failed: {e}")
            return None

    def _keyword_parse_free_text(self, text: str) -> Dict[str, str]:
        """Simple keyword-based fallback for free text parsing."""
        text_lower = text.lower()
        result: Dict[str, str] = {}

        # Energy keywords
        if any(w in text_lower for w in ["less intense", "calmer", "quieter", "relaxing"]):
            result["energy"] = "lower"
        elif any(w in text_lower for w in ["more exciting", "more active", "energetic"]):
            result["energy"] = "higher"

        # Budget keywords
        if any(w in text_lower for w in ["cheaper", "less expensive", "affordable", "budget"]):
            result["budget"] = "lower"
        elif any(w in text_lower for w in ["nicer", "upscale", "fancy", "premium"]):
            result["budget"] = "higher"

        # Mood keywords
        if any(w in text_lower for w in ["funnier", "lighter", "more fun", "comedy"]):
            result["mood"] = "funnier"
        elif any(w in text_lower for w in ["serious", "deeper", "thoughtful"]):
            result["mood"] = "more_serious"
        elif any(w in text_lower for w in ["darker", "edgier"]):
            result["mood"] = "darker"

        # Time keywords
        if any(w in text_lower for w in ["shorter", "quick", "brief"]):
            result["time"] = "shorter"
        elif any(w in text_lower for w in ["longer", "epic", "extended"]):
            result["time"] = "longer"

        return result

    def get_changes_description(self) -> str:
        """Get a human-readable description of all changes."""
        parts: List[str] = []

        if self.adjustments.excluded_candidates:
            n = len(self.adjustments.excluded_candidates)
            parts.append(f"Excluded {n} item(s)")

        if self.adjustments.additional_seeds:
            n = len(self.adjustments.additional_seeds)
            parts.append(f"Using {n} liked item(s) as extra signals")

        if self.adjustments.diversity_penalty_change > 0:
            parts.append("Increased result variety")

        if self.adjustments.filter_changes:
            for key, val in self.adjustments.filter_changes.items():
                parts.append(f"Adjusted {key} → {val}")

        if not parts:
            return "No changes applied."

        return "Changes: " + "; ".join(parts) + "."
