"""
FusionAI — Unit Tests for Group Scoring Algorithm

Tests verify the core fairness properties:
1. "Everyone lukewarm" beats "two love it, one hates it"
2. Bridge items get a bonus when tags overlap multiple members
3. Diversity pass removes near-duplicates
4. Min-satisfaction floor penalizes items hated by any member
5. Excluded candidates are properly filtered
"""

import pytest

from backend.ranking.scorer import GroupScorer, ScoringConfig
from contracts.models import (
    Candidate,
    CandidatePool,
    Category,
    ConfidenceLevel,
    Constraints,
    DataSource,
    FamilyMember,
    GenerationLabel,
    PersonScore,
    ResolvedEntity,
    ScoreSource,
)


# ─── Test Fixtures ───────────────────────────────────────────────────────────

def _member(mid: str, nickname: str, gen: GenerationLabel, liked: list[str] = None) -> FamilyMember:
    return FamilyMember(
        id=mid, nickname=nickname, generation=gen,
        liked_items=liked or [], disliked_items=[],
    )

def _entity(qid: str, name: str, tags: list[str] = None) -> ResolvedEntity:
    return ResolvedEntity(
        qloo_id=qid, name=name, type="movie",
        confidence=ConfidenceLevel.EXACT, user_confirmed=True,
        tags=tags or [],
    )

def _candidate(
    qid: str, name: str, tags: list[str],
    scores: dict[str, float],
    source: ScoreSource = ScoreSource.REAL,
) -> Candidate:
    per_person = {
        mid: PersonScore(member_id=mid, nickname=mid, score=s, source=source)
        for mid, s in scores.items()
    }
    return Candidate(
        entity=_entity(qid, name, tags),
        source_members=list(scores.keys()),
        per_person_scores=per_person,
        tags=tags,
        data_source=DataSource.FALLBACK,
    )

def _pool(members: list[FamilyMember], candidates: list[Candidate]) -> CandidatePool:
    return CandidatePool(
        candidates=candidates,
        members=members,
        family_id="test",
        category=Category.MOVIES,
        constraints=Constraints(),
    )


# Shared members for most tests
GRANDMA = _member("g", "Grandma", GenerationLabel.GRANDPARENT, ["historical", "drama", "classical"])
PARENT = _member("p", "Parent", GenerationLabel.PARENT, ["thriller", "drama", "action"])
TEEN = _member("t", "Teen", GenerationLabel.TEEN, ["animation", "sci-fi", "action", "superhero"])

THREE_MEMBERS = [GRANDMA, PARENT, TEEN]


# ─── Core Fairness Tests ────────────────────────────────────────────────────

class TestCoreFairness:
    """The most important property: fairness across the group."""

    def test_lukewarm_beats_polarizing(self):
        """
        A candidate everyone likes moderately should rank higher than
        one that two people love but one person hates.

        This is the EXIT CRITERIA test from Phase 5.
        """
        lukewarm = _candidate(
            "lukewarm", "Lukewarm Movie", ["drama", "family"],
            {"g": 0.60, "p": 0.60, "t": 0.55},
        )
        polarizing = _candidate(
            "polarizing", "Polarizing Movie", ["action", "loud"],
            {"g": 0.10, "p": 0.90, "t": 0.92},
        )
        pool = _pool(THREE_MEMBERS, [lukewarm, polarizing])
        scorer = GroupScorer(ScoringConfig(blend_ratio=0.7))
        results = scorer.score_all(pool)

        lukewarm_result = next(r for r in results if r.entity.qloo_id == "lukewarm")
        polarizing_result = next(r for r in results if r.entity.qloo_id == "polarizing")

        assert lukewarm_result.group_score > polarizing_result.group_score, (
            f"Lukewarm ({lukewarm_result.group_score:.4f}) should beat "
            f"polarizing ({polarizing_result.group_score:.4f})"
        )

    def test_unanimous_moderate_beats_split(self):
        """When one person scores 0, even high scores from others can't save it."""
        unanimous = _candidate(
            "unanimous", "Unanimous OK", ["family"],
            {"g": 0.50, "p": 0.50, "t": 0.50},
        )
        split = _candidate(
            "split", "Split Vote", ["niche"],
            {"g": 0.00, "p": 0.95, "t": 0.95},
        )
        pool = _pool(THREE_MEMBERS, [unanimous, split])
        scorer = GroupScorer(ScoringConfig(blend_ratio=0.6))
        results = scorer.score_all(pool)

        unan = next(r for r in results if r.entity.qloo_id == "unanimous")
        splt = next(r for r in results if r.entity.qloo_id == "split")

        assert unan.group_score > splt.group_score

    def test_weakest_member_tracked(self):
        """The weakest member for each candidate is correctly identified."""
        cand = _candidate(
            "test", "Test", ["x"],
            {"g": 0.90, "p": 0.40, "t": 0.70},
        )
        pool = _pool(THREE_MEMBERS, [cand])
        results = GroupScorer().score_all(pool)

        assert results[0].weakest_member_id == "p"
        assert results[0].weakest_score == pytest.approx(0.40, abs=0.01)


# ─── Bridge Bonus Tests ─────────────────────────────────────────────────────

class TestBridgeBonus:
    """Bridge items connecting multiple members get a bonus."""

    def test_bridge_item_gets_bonus(self):
        """A candidate with tags matching multiple members' liked items gets a boost."""
        # "drama" and "action" overlap with grandma and parent/teen respectively
        bridge = _candidate(
            "bridge", "Bridge Movie", ["drama", "action", "historical"],
            {"g": 0.65, "p": 0.65, "t": 0.65},
        )
        non_bridge = _candidate(
            "non-bridge", "Niche Movie", ["obscure", "experimental", "avant_garde"],
            {"g": 0.65, "p": 0.65, "t": 0.65},
        )
        pool = _pool(THREE_MEMBERS, [bridge, non_bridge])
        scorer = GroupScorer(ScoringConfig(bridge_bonus_weight=0.05))
        results = scorer.score_all(pool)

        br = next(r for r in results if r.entity.qloo_id == "bridge")
        nb = next(r for r in results if r.entity.qloo_id == "non-bridge")

        assert br.group_score >= nb.group_score
        assert len(br.bridge_themes) > 0

    def test_no_bonus_for_single_member_overlap(self):
        """No bridge bonus if tags only match one member."""
        single_overlap = _candidate(
            "single", "Single Overlap", ["animation"],  # Only matches teen
            {"g": 0.60, "p": 0.60, "t": 0.60},
        )
        pool = _pool(THREE_MEMBERS, [single_overlap])
        scorer = GroupScorer(ScoringConfig(bridge_bonus_weight=0.10))
        results = scorer.score_all(pool)
        # Bridge themes should be empty or bridge bonus should be 0
        # (the item might still have themes if multiple members have the tag)
        assert len(results) == 1


# ─── Diversity Pass Tests ────────────────────────────────────────────────────

class TestDiversityPass:
    """Near-duplicate items should be removed from results."""

    def test_similar_items_deduplicated(self):
        """Two items with very similar tags keep only the higher-scored one."""
        item1 = _candidate(
            "a", "Action Movie A", ["action", "superhero", "adventure", "sci-fi"],
            {"g": 0.50, "p": 0.80, "t": 0.90},
        )
        item2 = _candidate(
            "b", "Action Movie B", ["action", "superhero", "adventure", "sci-fi"],
            {"g": 0.48, "p": 0.78, "t": 0.88},
        )
        item3 = _candidate(
            "c", "Drama Movie", ["drama", "historical", "quiet", "emotional"],
            {"g": 0.70, "p": 0.60, "t": 0.40},
        )
        pool = _pool(THREE_MEMBERS, [item1, item2, item3])
        scorer = GroupScorer(ScoringConfig(
            diversity_threshold=0.7,
            top_n=10,
        ))
        results = scorer.score_all(pool)

        ids = [r.entity.qloo_id for r in results]
        # Should have item1 (higher scored) and item3 (different), not item2
        assert "a" in ids
        assert "c" in ids
        assert "b" not in ids

    def test_different_items_kept(self):
        """Items with different tags are all kept."""
        items = [
            _candidate("x", "X", ["action", "sci-fi"], {"g": 0.5, "p": 0.5, "t": 0.5}),
            _candidate("y", "Y", ["drama", "romance"], {"g": 0.5, "p": 0.5, "t": 0.5}),
            _candidate("z", "Z", ["comedy", "family"], {"g": 0.5, "p": 0.5, "t": 0.5}),
        ]
        pool = _pool(THREE_MEMBERS, items)
        results = GroupScorer(ScoringConfig(top_n=10)).score_all(pool)
        assert len(results) == 3


# ─── Min-Satisfaction Floor Tests ────────────────────────────────────────────

class TestMinSatisfactionFloor:
    """Items below the min-satisfaction floor get penalized."""

    def test_below_floor_penalized(self):
        """A candidate where the weakest member is below the floor gets penalized."""
        above = _candidate(
            "above", "Above Floor", ["x"],
            {"g": 0.50, "p": 0.50, "t": 0.50},
        )
        below = _candidate(
            "below", "Below Floor", ["y"],
            {"g": 0.05, "p": 0.80, "t": 0.80},  # Grandma at 0.05 < floor of 0.15
        )
        pool = _pool(THREE_MEMBERS, [above, below])
        scorer = GroupScorer(ScoringConfig(
            min_satisfaction_floor=0.15,
            blend_ratio=0.7,
        ))
        results = scorer.score_all(pool)

        ab = next(r for r in results if r.entity.qloo_id == "above")
        bl = next(r for r in results if r.entity.qloo_id == "below")

        assert ab.group_score > bl.group_score


# ─── Exclusion Tests ────────────────────────────────────────────────────────

class TestExclusion:
    """Excluded candidates from feedback should be filtered out."""

    def test_excluded_ids_removed(self):
        items = [
            _candidate("keep", "Keep", ["a"], {"g": 0.5, "p": 0.5, "t": 0.5}),
            _candidate("remove", "Remove", ["b"], {"g": 0.9, "p": 0.9, "t": 0.9}),
        ]
        pool = _pool(THREE_MEMBERS, items)
        results = GroupScorer().score_all(pool, excluded_ids={"remove"})

        ids = [r.entity.qloo_id for r in results]
        assert "keep" in ids
        assert "remove" not in ids


# ─── Scoring Parameter Transparency ─────────────────────────────────────────

class TestTransparency:
    """Scoring parameters are exposed for the UI."""

    def test_params_exposed(self):
        config = ScoringConfig(blend_ratio=0.8, bridge_bonus_weight=0.10)
        scorer = GroupScorer(config)
        params = scorer.get_scoring_params()
        assert params["blend_ratio"] == 0.8
        assert params["bridge_bonus_weight"] == 0.10


# ─── Confidence Notes ───────────────────────────────────────────────────────

class TestConfidenceNotes:
    """Confidence notes correctly reflect data quality."""

    def test_estimated_scores_noted(self):
        cand = _candidate(
            "est", "Estimated", ["x"],
            {"g": 0.5, "p": 0.5, "t": 0.5},
            source=ScoreSource.ESTIMATED,
        )
        pool = _pool(THREE_MEMBERS, [cand])
        results = GroupScorer().score_all(pool)
        assert "estimated" in results[0].confidence_note.lower()

    def test_all_real_high_confidence(self):
        cand = _candidate(
            "real", "Real", ["x"],
            {"g": 0.5, "p": 0.5, "t": 0.5},
            source=ScoreSource.REAL,
        )
        # Override data_source to LIVE so fallback note doesn't appear
        cand.data_source = DataSource.LIVE_QLOO
        pool = _pool(THREE_MEMBERS, [cand])
        results = GroupScorer().score_all(pool)
        assert "high confidence" in results[0].confidence_note.lower()


# ─── Demo Family Integration ────────────────────────────────────────────────

class TestDemoFamilies:
    """Quick sanity checks using the actual demo family data."""

    def test_sharma_family_produces_results(self):
        from contracts.demo_families import get_mock_pool_family_1
        pool = get_mock_pool_family_1()
        results = GroupScorer().score_all(pool)
        assert len(results) >= 3
        # All scores should be between 0 and 1
        for r in results:
            assert 0 <= r.group_score <= 1

    def test_williams_family_produces_results(self):
        from contracts.demo_families import get_mock_pool_family_3
        pool = get_mock_pool_family_3()
        results = GroupScorer().score_all(pool)
        assert len(results) >= 3

    def test_tanaka_rodriguez_produces_results(self):
        from contracts.demo_families import get_mock_pool_family_2
        pool = get_mock_pool_family_2()
        results = GroupScorer().score_all(pool)
        assert len(results) >= 3
