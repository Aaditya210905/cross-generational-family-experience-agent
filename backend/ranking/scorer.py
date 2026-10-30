"""
FusionAI — Fairness-Aware Group Ranking Engine

This is Person B's core algorithmic contribution.

Scoring Formula:
    group_score = α × weighted_avg + (1 − α) × min_score + bridge_bonus

Where:
    α (blend_ratio)    — balance between average and minimum satisfaction (default 0.7)
    weighted_avg       — Σ(w_i × s_i) / Σ(w_i), weighted average of per-person scores
    min_score          — the lowest individual score (ensures no one is ignored)
    bridge_bonus       — β × (overlapping_members / total) when ≥2 members share tags

Post-scoring:
    - Diversity pass removes near-duplicates (Jaccard > threshold)
    - Min-satisfaction floor penalizes items below a threshold for any member
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from contracts.models import (
    Candidate,
    CandidatePool,
    DataSource,
    FamilyMember,
    PersonExplanation,
    ScoredCandidate,
    taste_texts,
)


@dataclass
class ScoringConfig:
    """All tunable parameters for the group scoring algorithm."""
    blend_ratio: float = 0.7              # α: weight of avg vs min
    bridge_bonus_weight: float = 0.05     # β: bridge item boost
    diversity_threshold: float = 0.7      # Jaccard threshold for dedup
    min_satisfaction_floor: float = 0.15  # Heavy penalty below this
    top_n: int = 8                        # Max results to return
    member_weights: Dict[str, float] = field(default_factory=dict)  # per-member weights


class GroupScorer:
    """
    Ranks candidates for a multi-person group using fairness-aware scoring.

    The algorithm ensures:
    1. No single member's preferences dominate (weighted average)
    2. No member is completely ignored (minimum-satisfaction blend)
    3. Bridge items connecting generations get a small boost
    4. Near-duplicate results are removed for diversity
    """

    def __init__(self, config: Optional[ScoringConfig] = None):
        self.config = config or ScoringConfig()

    def score_all(
        self,
        pool: CandidatePool,
        excluded_ids: Optional[Set[str]] = None,
    ) -> List[ScoredCandidate]:
        """
        Score all candidates in the pool and return sorted results.

        Args:
            pool: The candidate pool from Person A
            excluded_ids: Entity IDs to exclude (from feedback)

        Returns:
            Sorted list of ScoredCandidates, best first
        """
        excluded = excluded_ids or set()
        members = pool.members
        member_tags = self._build_member_tag_map(members)

        scored: List[ScoredCandidate] = []

        for candidate in pool.candidates:
            # Skip excluded candidates
            if candidate.entity.qloo_id in excluded:
                continue

            result = self._score_single(candidate, members, member_tags)
            if result is not None:
                scored.append(result)

        # Sort by group score descending
        scored.sort(key=lambda s: s.group_score, reverse=True)

        # Diversity pass
        diverse = self._diversity_pass(scored)

        return diverse

    def _score_single(
        self,
        candidate: Candidate,
        members: List[FamilyMember],
        member_tags: Dict[str, Set[str]],
    ) -> Optional[ScoredCandidate]:
        """Score a single candidate for the group."""
        if not members or not candidate.per_person_scores:
            return None

        # ── 1. Collect per-person scores ─────────────────────────────────
        per_person_scores: Dict[str, float] = {}
        weights: Dict[str, float] = {}

        for member in members:
            ps = candidate.per_person_scores.get(member.id)
            if ps:
                per_person_scores[member.id] = ps.score
                weights[member.id] = self.config.member_weights.get(member.id, 1.0)
            else:
                # Missing score — assign a neutral value
                per_person_scores[member.id] = 0.3
                weights[member.id] = self.config.member_weights.get(member.id, 1.0)

        # ── 2. Weighted average ──────────────────────────────────────────
        total_weight = sum(weights.values())
        if total_weight == 0:
            return None

        weighted_avg = sum(
            weights[mid] * per_person_scores[mid]
            for mid in per_person_scores
        ) / total_weight

        # ── 3. Minimum satisfaction ──────────────────────────────────────
        min_score = min(per_person_scores.values())
        min_member_id = min(per_person_scores, key=per_person_scores.get)

        # Find the weakest member's nickname
        weakest_nickname = min_member_id
        for m in members:
            if m.id == min_member_id:
                weakest_nickname = m.nickname
                break

        # ── 4. Base group score ──────────────────────────────────────────
        alpha = self.config.blend_ratio
        base_score = alpha * weighted_avg + (1 - alpha) * min_score

        # ── 5. Min-satisfaction floor penalty ────────────────────────────
        if min_score < self.config.min_satisfaction_floor:
            penalty = (self.config.min_satisfaction_floor - min_score) * 0.3
            base_score = max(0.0, base_score - penalty)

        # ── 6. Bridge bonus ──────────────────────────────────────────────
        bridge_bonus, bridge_themes = self._compute_bridge_bonus(
            candidate, members, member_tags
        )

        # ── 7. Final score ───────────────────────────────────────────────
        group_score = min(1.0, base_score + bridge_bonus)

        # ── 8. Build confidence note ─────────────────────────────────────
        confidence_note = self._build_confidence_note(candidate, members)

        # ── 9. Build per-person details ──────────────────────────────────
        per_person_details = []
        for member in members:
            ps = candidate.per_person_scores.get(member.id)
            score = per_person_scores.get(member.id, 0.0)
            source_label = ""
            if ps and ps.source.value == "estimated":
                source_label = " (estimated)"

            # Find related liked items via tag overlap
            member_tag_set = member_tags.get(member.id, set())
            candidate_tag_set = set(candidate.tags)
            overlapping = member_tag_set & candidate_tag_set

            per_person_details.append(PersonExplanation(
                member_id=member.id,
                nickname=member.nickname,
                avatar_emoji=member.avatar_emoji,
                score=score,
                reason=f"Match score: {score:.0%}{source_label}",
                related_liked_items=list(overlapping)[:5],
            ))

        return ScoredCandidate(
            entity=candidate.entity,
            group_score=round(group_score, 4),
            per_person_scores={k: round(v, 4) for k, v in per_person_scores.items()},
            per_person_details=per_person_details,
            weakest_member_id=min_member_id,
            weakest_member_nickname=weakest_nickname,
            weakest_score=round(min_score, 4),
            bridge_themes=bridge_themes,
            constraint_results=[],      # Filled by constraint engine
            confidence_note=confidence_note,
            data_source=candidate.data_source,
            tags=candidate.tags,
            metadata=candidate.metadata,
            average_score=round(weighted_avg, 4),
            bridge_bonus=round(bridge_bonus, 4),
            soft_constraint_penalty=0.0,
        )

    def _compute_bridge_bonus(
        self,
        candidate: Candidate,
        members: List[FamilyMember],
        member_tags: Dict[str, Set[str]],
    ) -> Tuple[float, List[str]]:
        """
        Compute bridge bonus for candidates whose tags overlap with
        liked entities of multiple distinct members.

        A bridge item is special because it connects across generational
        or cultural divides — e.g., a movie about food that appeals to
        both the grandparent who loves cooking and the teen who loves
        animated food movies.
        """
        candidate_tags = set(candidate.tags)
        if not candidate_tags:
            return 0.0, []

        overlapping_members = 0
        shared_themes: Set[str] = set()

        for member in members:
            mtags = member_tags.get(member.id, set())
            overlap = candidate_tags & mtags
            if overlap:
                overlapping_members += 1
                shared_themes.update(overlap)

        # Need overlap with at least 2 distinct members for a bridge bonus
        if overlapping_members >= 2:
            ratio = overlapping_members / len(members)
            bonus = self.config.bridge_bonus_weight * ratio
            return round(bonus, 4), sorted(shared_themes)[:5]

        return 0.0, []

    def _diversity_pass(self, scored: List[ScoredCandidate]) -> List[ScoredCandidate]:
        """
        Remove near-duplicate items so the top results aren't clones.

        Uses Jaccard similarity on tag sets. If two items share > threshold
        similarity, only the higher-scored one is kept.
        """
        if not scored:
            return scored

        final: List[ScoredCandidate] = []
        seen_tag_sets: List[Set[str]] = []

        for candidate in scored:
            if self._is_too_similar(candidate, seen_tag_sets):
                continue
            final.append(candidate)
            seen_tag_sets.append(set(candidate.tags))
            if len(final) >= self.config.top_n:
                break

        return final

    def _is_too_similar(
        self,
        candidate: ScoredCandidate,
        seen_tag_sets: List[Set[str]],
    ) -> bool:
        """Check if a candidate is too similar to any already-selected item."""
        candidate_tags = set(candidate.tags)
        if not candidate_tags:
            return False

        for seen in seen_tag_sets:
            if not seen:
                continue
            intersection = candidate_tags & seen
            union = candidate_tags | seen
            if union:
                jaccard = len(intersection) / len(union)
                if jaccard > self.config.diversity_threshold:
                    return True
        return False

    def _build_member_tag_map(
        self,
        members: List[FamilyMember],
    ) -> Dict[str, Set[str]]:
        """
        Build a mapping of member_id → set of tags derived from their
        liked items. We do a simple keyword extraction.
        """
        tag_map: Dict[str, Set[str]] = {}
        for member in members:
            tags: Set[str] = set()
            for item in taste_texts(member.liked_items):
                words = item.lower().replace("-", " ").split()
                for word in words:
                    cleaned = word.strip(",.!?()[]")
                    if len(cleaned) > 2:
                        tags.add(cleaned)
            tag_map[member.id] = tags
        return tag_map

    def _build_confidence_note(
        self,
        candidate: Candidate,
        members: List[FamilyMember],
    ) -> str:
        """Generate a confidence note based on data quality signals."""
        notes: List[str] = []

        # Check for estimated scores
        estimated_count = sum(
            1 for ps in candidate.per_person_scores.values()
            if ps.source.value == "estimated"
        )
        if estimated_count > 0:
            total = len(members)
            notes.append(
                f"{estimated_count}/{total} scores are estimated"
            )

        # Check entity confidence
        if candidate.entity.confidence.value == "ambiguous":
            notes.append("entity match is ambiguous")
        elif candidate.entity.confidence.value == "near":
            notes.append("entity is a near match")

        # Check data source
        if candidate.data_source == DataSource.FALLBACK:
            notes.append("using fallback data")
        elif candidate.data_source == DataSource.CACHED_QLOO:
            notes.append("using cached data")

        if notes:
            return "Note: " + "; ".join(notes) + "."
        return "High confidence — all scores from live data."

    def get_scoring_params(self) -> Dict[str, float]:
        """Return the current scoring parameters for transparency."""
        return {
            "blend_ratio": self.config.blend_ratio,
            "bridge_bonus_weight": self.config.bridge_bonus_weight,
            "diversity_threshold": self.config.diversity_threshold,
            "min_satisfaction_floor": self.config.min_satisfaction_floor,
            "top_n": float(self.config.top_n),
        }
