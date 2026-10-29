"""
Retrieval Engine

Builds the Candidate Pool by:
1. Running per-person Qloo Insights queries (each member's resolved entities as signals)
2. Running one combined query (all members' entities pooled for bridge candidates)
3. Merging and deduplicating all results
4. Filling in missing per-person scores via rank-based imputation and tag overlap
5. Removing already-liked and disliked items
6. Normalizing all scores to 0-1 per person

Output: CandidatePool — the handoff object to Person B.
"""

import asyncio
import logging
from typing import Optional
from collections import defaultdict

from backend.qloo.client import get_qloo_client, QlooAPIError
from backend.models.entities import ResolvedProfile, ResolvedMember
from backend.models.candidates import (
    Candidate,
    CandidateScore,
    CandidatePool,
    ScoreSource,
    DataSource,
)
from backend.models.common import AdjustmentSet

logger = logging.getLogger(__name__)


class RetrievalEngine:
    """Builds the candidate pool from Qloo Insights queries."""

    def __init__(self, max_concurrency: int = 2):
        self.client = get_qloo_client()
        self._semaphore = asyncio.Semaphore(max_concurrency)

    async def build_candidate_pool(
        self,
        profile: ResolvedProfile,
        category: str,
        location: Optional[str] = None,
        adjustment: Optional[AdjustmentSet] = None,
    ) -> CandidatePool:
        """
        Build the complete candidate pool for a family.

        Args:
            profile: Resolved family profile with Qloo entity IDs
            category: Recommendation category (movies, restaurants, etc.)
            location: Optional location for place-based queries
            adjustment: Optional feedback adjustments from a previous round

        Returns:
            CandidatePool with all candidates scored per person
        """
        member_ids = [m.member_id for m in profile.members]

        # Collect all entity IDs we need to exclude
        excluded_ids = set()
        if adjustment:
            excluded_ids.update(adjustment.excluded_entity_ids)

        # Collect all liked and disliked entity IDs (to filter out of results)
        liked_ids = set()
        disliked_ids = set()
        for member in profile.members:
            for entity in member.resolved_likes:
                liked_ids.add(entity.qloo_id)
            for entity in member.resolved_dislikes:
                disliked_ids.add(entity.qloo_id)

        excluded_ids.update(disliked_ids)

        # ── Step 1: Per-person Insights queries ───────────────────────────
        per_person_results = await self._query_per_person(
            profile.members, category, location, adjustment
        )

        # ── Step 2: Combined query ────────────────────────────────────────
        combined_results = await self._query_combined(
            profile.members, category, location, adjustment
        )

        # ── Step 3: Merge and deduplicate ─────────────────────────────────
        raw_pool = self._merge_results(
            per_person_results, combined_results, member_ids
        )

        # ── Step 4: Fill missing per-person scores ────────────────────────
        self._fill_missing_scores(raw_pool, per_person_results, member_ids, profile.members)

        # ── Step 5: Remove excluded and already-liked items ───────────────
        filtered_pool = {
            eid: candidate
            for eid, candidate in raw_pool.items()
            if eid not in excluded_ids and eid not in liked_ids
        }

        # ── Step 6: Normalize scores to 0-1 per person ───────────────────
        candidates = list(filtered_pool.values())
        self._normalize_scores(candidates, member_ids)

        # Build stats
        stats = {
            "total_raw_candidates": len(raw_pool),
            "excluded": len(raw_pool) - len(filtered_pool),
            "final_candidates": len(candidates),
            "per_person_query_counts": {
                mid: len(results) for mid, results in per_person_results.items()
            },
            "combined_query_count": len(combined_results),
        }

        logger.info(
            f"Candidate pool built: {len(candidates)} candidates "
            f"({stats['excluded']} excluded)"
        )

        return CandidatePool(
            candidates=candidates,
            category=category,
            member_ids=member_ids,
            pool_stats=stats,
        )

    async def _get_insights_throttled(
        self,
        signal_ids: list[str],
        entity_type: str,
        limit: int,
        location: Optional[str] = None,
    ) -> list[dict]:
        """Fetch insights throttled by concurrency semaphore."""
        async with self._semaphore:
            return await self.client.get_insights(
                signal_ids=signal_ids,
                entity_type=entity_type,
                limit=limit,
                location=location,
            )

    async def _query_per_person(
        self,
        members: list[ResolvedMember],
        category: str,
        location: Optional[str],
        adjustment: Optional[AdjustmentSet],
    ) -> dict[str, list[dict]]:
        """Run per-person Insights queries in parallel."""
        tasks = {}

        for member in members:
            signal_ids = [e.qloo_id for e in member.resolved_likes]

            # Add additional seed signals from feedback
            if adjustment and adjustment.additional_seed_entity_ids:
                signal_ids.extend(adjustment.additional_seed_entity_ids)

            if not signal_ids:
                logger.warning(f"No signals for {member.nickname}, skipping query")
                continue

            tasks[member.member_id] = self._get_insights_throttled(
                signal_ids=signal_ids,
                entity_type=category,
                limit=25,
                location=location,
            )

        # Run all queries in parallel
        results = {}
        if tasks:
            task_items = list(tasks.items())
            responses = await asyncio.gather(
                *[t for _, t in task_items],
                return_exceptions=True,
            )

            for (member_id, _), response in zip(task_items, responses):
                if isinstance(response, Exception):
                    logger.error(f"Insights query failed for {member_id}: {response}")
                    results[member_id] = []
                else:
                    results[member_id] = response

        return results

    async def _query_combined(
        self,
        members: list[ResolvedMember],
        category: str,
        location: Optional[str],
        adjustment: Optional[AdjustmentSet],
    ) -> list[dict]:
        """Run one combined query with all members' entities pooled."""
        all_signal_ids = []
        for member in members:
            all_signal_ids.extend(e.qloo_id for e in member.resolved_likes)

        if adjustment and adjustment.additional_seed_entity_ids:
            all_signal_ids.extend(adjustment.additional_seed_entity_ids)

        if not all_signal_ids:
            logger.warning("No combined signals, skipping combined query")
            return []

        # Deduplicate while preserving order
        seen = set()
        unique_signals = []
        for sid in all_signal_ids:
            if sid not in seen:
                seen.add(sid)
                unique_signals.append(sid)

        try:
            results = await self._get_insights_throttled(
                signal_ids=unique_signals,
                entity_type=category,
                limit=30,
                location=location,
            )
            return results
        except QlooAPIError as e:
            logger.error(f"Combined insights query failed: {e}")
            return []

    def _merge_results(
        self,
        per_person: dict[str, list[dict]],
        combined: list[dict],
        member_ids: list[str],
    ) -> dict[str, Candidate]:
        """
        Merge all results into a deduplicated pool.
        
        Each candidate tracks which member(s)' queries found it and
        what score/rank each person gave it.
        """
        pool: dict[str, Candidate] = {}

        # Process per-person results
        for member_id, results in per_person.items():
            for result in results:
                entity_id = result["id"]
                rank = result.get("rank", 0)
                affinity = result.get("affinity")

                if entity_id not in pool:
                    pool[entity_id] = Candidate(
                        entity_id=entity_id,
                        name=result["name"],
                        entity_type=result.get("type", ""),
                        tags=result.get("tags", []),
                        properties=result.get("properties", {}),
                        per_person_scores=[],
                        source_members=[],
                        data_source=DataSource(result.get("_data_source", "live")),
                        affinity=affinity,
                    )

                candidate = pool[entity_id]
                if member_id not in candidate.source_members:
                    candidate.source_members.append(member_id)

                # Add this person's direct score
                score_value = self._affinity_to_score(affinity, rank, len(results))
                candidate.per_person_scores.append(CandidateScore(
                    member_id=member_id,
                    score=score_value,
                    source=ScoreSource.DIRECT,
                    rank=rank,
                ))

        # Process combined results
        for result in combined:
            entity_id = result["id"]
            if entity_id not in pool:
                pool[entity_id] = Candidate(
                    entity_id=entity_id,
                    name=result["name"],
                    entity_type=result.get("type", ""),
                    tags=result.get("tags", []),
                    properties=result.get("properties", {}),
                    per_person_scores=[],
                    source_members=["_combined"],
                    data_source=DataSource(result.get("_data_source", "live")),
                    affinity=result.get("affinity"),
                )
            else:
                # Update source if not already marked
                if "_combined" not in pool[entity_id].source_members:
                    pool[entity_id].source_members.append("_combined")

        return pool

    def _fill_missing_scores(
        self,
        pool: dict[str, Candidate],
        per_person: dict[str, list[dict]],
        member_ids: list[str],
        members: list[ResolvedMember],
    ) -> None:
        """
        Fill in missing per-person scores using imputation.

        A candidate found via Grandma's query has no direct score for the teenager.
        We estimate it using:
        1. Rank-based imputation (if the candidate appears in a person's list)
        2. Tag overlap between the candidate and the person's liked entities
        """
        # Build per-member tag sets for tag-overlap imputation
        member_tags: dict[str, set[str]] = {}
        for member in members:
            tags = set()
            for entity in member.resolved_likes:
                tags.update(entity.tags)
            member_tags[member.member_id] = tags

        for entity_id, candidate in pool.items():
            scored_member_ids = {
                s.member_id for s in candidate.per_person_scores
            }

            for member_id in member_ids:
                if member_id in scored_member_ids:
                    continue

                # Try rank-based imputation from per-person results
                rank_score = self._impute_from_rank(
                    entity_id, member_id, per_person
                )

                if rank_score is not None:
                    candidate.per_person_scores.append(CandidateScore(
                        member_id=member_id,
                        score=rank_score,
                        source=ScoreSource.IMPUTED_RANK,
                    ))
                else:
                    # Fall back to tag-overlap imputation
                    tag_score = self._impute_from_tags(
                        candidate.tags, member_tags.get(member_id, set())
                    )
                    candidate.per_person_scores.append(CandidateScore(
                        member_id=member_id,
                        score=tag_score,
                        source=ScoreSource.IMPUTED_TAGS,
                    ))

    def _impute_from_rank(
        self,
        entity_id: str,
        member_id: str,
        per_person: dict[str, list[dict]],
    ) -> Optional[float]:
        """
        Check if the entity appears in this member's personal results
        at a lower rank (wasn't in the top scores but might be present).
        """
        results = per_person.get(member_id, [])
        for result in results:
            if result["id"] == entity_id:
                rank = result.get("rank", 0)
                total = len(results)
                # Convert rank to a score: top rank = higher score
                return max(0.1, 1.0 - (rank / max(total, 1)))
        return None

    @staticmethod
    def _impute_from_tags(
        candidate_tags: list[str],
        member_liked_tags: set[str],
    ) -> float:
        """
        Estimate a score based on tag overlap between the candidate
        and what the member likes.
        
        Returns a conservative score (0.2-0.6 range) to reflect uncertainty.
        """
        if not candidate_tags or not member_liked_tags:
            return 0.3  # Default middle-low score for unknown

        candidate_tag_set = {t.lower() for t in candidate_tags}
        member_tag_set = {t.lower() for t in member_liked_tags}

        overlap = candidate_tag_set & member_tag_set
        if not overlap:
            return 0.2

        overlap_ratio = len(overlap) / max(len(candidate_tag_set), 1)
        # Scale to 0.3-0.6 range (never too confident about imputed scores)
        return min(0.6, 0.3 + overlap_ratio * 0.3)

    @staticmethod
    def _affinity_to_score(
        affinity: Optional[float],
        rank: int,
        total: int,
    ) -> float:
        """
        Convert a Qloo affinity value to a 0-1 score.
        
        If affinity is available, use it. Otherwise, use rank position.
        Note: The actual affinity scale will be determined in Phase 0 verification.
        """
        if affinity is not None:
            # Assume affinity is already 0-1; clamp just in case
            if affinity > 1.0:
                # Might be on a 0-100 scale
                return min(1.0, affinity / 100.0)
            return max(0.0, min(1.0, float(affinity)))

        # Rank-based fallback
        if total <= 0:
            return 0.5
        return max(0.1, 1.0 - (rank / max(total, 1)))

    @staticmethod
    def _normalize_scores(
        candidates: list[Candidate],
        member_ids: list[str],
    ) -> None:
        """
        Normalize all per-person scores to 0-1 using min-max normalization.
        
        This ensures a generous scorer doesn't dominate the group ranking.
        Applied per-person across all candidates.
        """
        for member_id in member_ids:
            # Collect all scores for this member
            scores = []
            for candidate in candidates:
                for ps in candidate.per_person_scores:
                    if ps.member_id == member_id:
                        scores.append(ps.score)

            if not scores:
                continue

            min_score = min(scores)
            max_score = max(scores)
            score_range = max_score - min_score

            if score_range < 0.001:
                # All scores are the same — normalize to 0.5
                for candidate in candidates:
                    for ps in candidate.per_person_scores:
                        if ps.member_id == member_id:
                            ps.score = 0.5
            else:
                for candidate in candidates:
                    for ps in candidate.per_person_scores:
                        if ps.member_id == member_id:
                            ps.score = round(
                                (ps.score - min_score) / score_range, 4
                            )
