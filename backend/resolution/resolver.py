"""
Entity Resolution Module

Turns raw preference text ("Bollywood classics", "Ghibli movies", "sushi")
into verified Qloo entities with confidence scores.

Key behaviors:
- Parallel search calls for speed
- Confidence scoring (exact, near, ambiguous)
- Graceful failure: unresolved items flagged but not fatal
- Confirmation chips for ambiguous matches
"""

import asyncio
import logging
from typing import Optional

from backend.qloo.client import get_qloo_client, QlooAPIError
from backend.models.entities import (
    ResolvedEntity,
    ResolvedMember,
    ResolvedProfile,
    ConfidenceLevel,
)
from backend.models.family import FamilyMember, Preference, CategoryType
from backend.llm import expand_preference_for_qloo, is_llm_available

logger = logging.getLogger(__name__)


class EntityResolver:
    """Resolves raw text preferences into Qloo entities."""

    def __init__(self, max_concurrency: int = 3):
        self.client = get_qloo_client()
        self._semaphore = asyncio.Semaphore(max_concurrency)

    async def resolve_family(
        self,
        members: list[FamilyMember],
        category: CategoryType,
    ) -> ResolvedProfile:
        """
        Resolve all preferences for all family members.

        Runs lookups in parallel across all members for speed.

        Args:
            members: List of family members with their preferences
            category: The recommendation category (used as entity type hint)

        Returns:
            ResolvedProfile with all members' preferences resolved
        """
        # Gather all resolution tasks
        tasks = [
            self._resolve_member(member, category)
            for member in members
        ]

        resolved_members = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle any exceptions
        final_members = []
        for i, result in enumerate(resolved_members):
            if isinstance(result, Exception):
                logger.error(
                    f"Failed to resolve member {members[i].nickname}: {result}"
                )
                # Create a member with everything unresolved
                final_members.append(ResolvedMember(
                    member_id=members[i].id,
                    nickname=members[i].nickname,
                    resolved_likes=[],
                    resolved_dislikes=[],
                    unresolved=[p.text for p in members[i].liked_items],
                ))
            else:
                final_members.append(result)

        # Compute stats
        total = sum(
            len(m.resolved_likes) + len(m.resolved_dislikes) + len(m.unresolved)
            for m in final_members
        )
        resolved = sum(
            len(m.resolved_likes) + len(m.resolved_dislikes)
            for m in final_members
        )
        unresolved = sum(len(m.unresolved) for m in final_members)
        needs_confirm = sum(
            sum(1 for e in m.resolved_likes if e.needs_confirmation)
            + sum(1 for e in m.resolved_dislikes if e.needs_confirmation)
            for m in final_members
        )

        return ResolvedProfile(
            members=final_members,
            resolution_stats={
                "total_preferences": total,
                "resolved": resolved,
                "unresolved": unresolved,
                "needs_confirmation": needs_confirm,
                "resolution_rate": round(resolved / total, 3) if total > 0 else 0,
            },
        )

    async def _resolve_member(
        self,
        member: FamilyMember,
        category: CategoryType,
    ) -> ResolvedMember:
        """Resolve a single member's preferences."""
        # Resolve likes in parallel
        like_tasks = [
            self._resolve_preference(pref, category)
            for pref in member.liked_items
        ]
        # Resolve dislikes in parallel
        dislike_tasks = [
            self._resolve_preference(pref, category)
            for pref in member.disliked_items
        ]

        all_results = await asyncio.gather(
            *like_tasks, *dislike_tasks, return_exceptions=True
        )

        like_results = all_results[: len(like_tasks)]
        dislike_results = all_results[len(like_tasks):]

        resolved_likes = []
        resolved_dislikes = []
        unresolved = []

        # Process likes
        for i, result in enumerate(like_results):
            if isinstance(result, Exception):
                logger.warning(
                    f"Could not resolve like '{member.liked_items[i].text}': {result}"
                )
                unresolved.append(member.liked_items[i].text)
            elif result is None:
                unresolved.append(member.liked_items[i].text)
            else:
                resolved_likes.append(result)

        # Process dislikes
        for i, result in enumerate(dislike_results):
            if isinstance(result, Exception):
                logger.warning(
                    f"Could not resolve dislike '{member.disliked_items[i].text}': {result}"
                )
                # Dislikes we can't resolve are just silently skipped
            elif result is not None:
                resolved_dislikes.append(result)

        logger.info(
            f"Resolved {member.nickname}: "
            f"{len(resolved_likes)} likes, "
            f"{len(resolved_dislikes)} dislikes, "
            f"{len(unresolved)} unresolved"
        )

        return ResolvedMember(
            member_id=member.id,
            nickname=member.nickname,
            resolved_likes=resolved_likes,
            resolved_dislikes=resolved_dislikes,
            unresolved=unresolved,
        )

    async def _resolve_preference(
        self,
        preference: Preference,
        default_category: CategoryType,
    ) -> Optional[ResolvedEntity]:
        """
        Resolve a single preference text to a Qloo entity.

        Uses the Qloo search endpoint and scores confidence based on
        how well the top result matches the query.
        """
        entity_type = (preference.category or default_category).value

        try:
            async with self._semaphore:
                results = await self.client.search(
                    query=preference.text,
                    entity_type=entity_type,
                    limit=5,
                )
        except QlooAPIError as e:
            logger.error(f"Qloo search failed for '{preference.text}': {e}")
            results = []

        confidence = self._score_confidence(preference.text, results[0]) if results else ConfidenceLevel.UNRESOLVED

        # If Qloo returned no results or low confidence (e.g. vague phrase like "Bollywood classics"),
        # use LLM query expansion to find canonical entity titles for Qloo to search
        if (not results or confidence in (ConfidenceLevel.LOW, ConfidenceLevel.UNRESOLVED)) and is_llm_available():
            try:
                expanded_queries = await expand_preference_for_qloo(preference.text, entity_type)
                for exp_q in expanded_queries:
                    if exp_q.lower() == preference.text.lower():
                        continue
                    try:
                        async with self._semaphore:
                            exp_results = await self.client.search(
                                query=exp_q,
                                entity_type=entity_type,
                                limit=3,
                            )
                        if exp_results:
                            if not results or confidence == ConfidenceLevel.LOW:
                                # Expanded canonical search is much higher quality than a weak partial match
                                results = exp_results + (results or [])
                                top = exp_results[0]
                                confidence = ConfidenceLevel.MEDIUM
                                break
                            else:
                                results.extend(exp_results)
                    except Exception as err:
                        logger.debug(f"Expanded Qloo search failed for '{exp_q}': {err}")
            except Exception as e:
                logger.warning(f"LLM query expansion fallback failed: {e}")

        if not results:
            logger.warning(f"No results for '{preference.text}'")
            return None

        top = results[0]
        if confidence == ConfidenceLevel.UNRESOLVED:
            confidence = self._score_confidence(preference.text, top)

        # Build alternatives for ambiguous matches
        alternatives = []
        if confidence in (ConfidenceLevel.LOW, ConfidenceLevel.MEDIUM) and len(results) > 1:
            for alt in results[1:4]:  # Include up to 3 alternatives
                alternatives.append(ResolvedEntity(
                    qloo_id=alt["id"],
                    name=alt["name"],
                    entity_type=alt.get("type", entity_type),
                    confidence=ConfidenceLevel.LOW,
                    original_text=preference.text,
                    tags=alt.get("tags", []),
                    properties=alt.get("properties", {}),
                    needs_confirmation=True,
                ))

        return ResolvedEntity(
            qloo_id=top["id"],
            name=top["name"],
            entity_type=top.get("type", entity_type),
            confidence=confidence,
            original_text=preference.text,
            tags=top.get("tags", []),
            properties=top.get("properties", {}),
            needs_confirmation=confidence != ConfidenceLevel.HIGH,
            alternatives=alternatives,
        )

    @staticmethod
    def _score_confidence(query: str, result: dict) -> ConfidenceLevel:
        """
        Score how confident we are that the result matches the query.
        
        Levels:
        - HIGH: The result name closely matches the query
        - MEDIUM: Partial or fuzzy match
        - LOW: Weak match, likely ambiguous
        """
        query_lower = query.lower().strip()
        name_lower = result.get("name", "").lower().strip()

        # Exact match
        if query_lower == name_lower:
            return ConfidenceLevel.HIGH

        # Query is contained in the name or vice versa
        if query_lower in name_lower or name_lower in query_lower:
            return ConfidenceLevel.HIGH

        # Check word overlap
        query_words = set(query_lower.split())
        name_words = set(name_lower.split())
        common = query_words & name_words

        if len(common) >= len(query_words) * 0.6:
            return ConfidenceLevel.MEDIUM

        if common:
            return ConfidenceLevel.LOW

        # Very weak match — the search returned something but it's not clear
        return ConfidenceLevel.LOW

    async def resolve_single(
        self,
        text: str,
        entity_type: str,
    ) -> Optional[ResolvedEntity]:
        """
        Resolve a single text query. Convenience method for UI autocomplete.
        """
        pref = Preference(text=text, category=CategoryType(entity_type))
        return await self._resolve_preference(pref, CategoryType(entity_type))
