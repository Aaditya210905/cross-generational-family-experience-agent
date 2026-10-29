"""
FusionAI — Constraint Engine Tests

Verifies deterministic constraint filtering:
- Hard constraints (removes item: category mismatch, dietary violations, at-home)
- Soft constraints (applies penalty + warning: budget, energy, time, mobility)
- Unverified badges
- Penalty re-ranking
"""

import pytest
from contracts.models import (
    BudgetBand,
    Category,
    ConfidenceLevel,
    Constraints,
    ConstraintStatus,
    ConstraintType,
    EnergyLevel,
    ResolvedEntity,
    ScoredCandidate,
    TimeAvailable,
)
from backend.constraints.engine import ConstraintEngine


def _make_candidate(
    qloo_id: str,
    name: str,
    entity_type: str = "restaurant",
    tags: list = None,
    metadata: dict = None,
    group_score: float = 0.85,
) -> ScoredCandidate:
    resolved = ResolvedEntity(
        qloo_id=qloo_id,
        name=name,
        type=entity_type,
        confidence=ConfidenceLevel.EXACT,
        tags=tags or [],
    )
    return ScoredCandidate(
        entity=resolved,
        group_score=group_score,
        per_person_scores={"p1": 0.8, "p2": 0.8},
        bridge_themes=[],
        group_explanation="Great match",
        tags=tags or [],
        metadata=metadata or {},
    )


class TestHardConstraints:
    def test_category_mismatch_fails_hard(self):
        engine = ConstraintEngine()
        movie = _make_candidate("m1", "Inception", entity_type="movie")
        constraints = Constraints(category=Category.RESTAURANTS)

        passed, filtered = engine.apply_all([movie], constraints)
        assert len(passed) == 0
        assert len(filtered) == 1
        assert any(c.status == ConstraintStatus.FAIL for c in filtered[0].constraint_results)

    def test_dietary_hard_fail_on_prohibited_tags(self):
        engine = ConstraintEngine()
        steakhouse = _make_candidate(
            "r1", "Big Steakhouse",
            entity_type="restaurant",
            tags=["steakhouse", "meat", "bbq"],
        )
        constraints = Constraints(
            category=Category.RESTAURANTS,
            dietary=["vegetarian"],
        )

        passed, filtered = engine.apply_all([steakhouse], constraints)
        assert len(passed) == 0
        assert len(filtered) == 1
        assert any(c.status == ConstraintStatus.FAIL for c in filtered[0].constraint_results)

    def test_dietary_pass_with_matching_tags(self):
        engine = ConstraintEngine()
        veg_place = _make_candidate(
            "r2", "Green Cafe",
            entity_type="restaurant",
            tags=["vegetarian", "plant_based", "cafe"],
        )
        constraints = Constraints(
            category=Category.RESTAURANTS,
            dietary=["vegetarian"],
        )

        passed, filtered = engine.apply_all([veg_place], constraints)
        assert len(passed) == 1
        assert len(filtered) == 0

    def test_at_home_filters_out_venues(self):
        engine = ConstraintEngine()
        venue = _make_candidate(
            "r3", "Olive Garden",
            entity_type="restaurant",
            tags=["restaurant", "italian"],
        )
        streaming_movie = _make_candidate(
            "m2", "Spirited Away",
            entity_type="movie",
            tags=["movie", "anime"],
        )
        constraints = Constraints(
            category=Category.MOVIES,
            location="at_home",
        )

        passed, filtered = engine.apply_all([venue, streaming_movie], constraints)
        assert len(passed) == 1
        assert passed[0].entity.name == "Spirited Away"
        assert len(filtered) == 1
        assert filtered[0].entity.name == "Olive Garden"


class TestSoftConstraints:
    def test_budget_exceeded_applies_penalty(self):
        engine = ConstraintEngine()
        expensive = _make_candidate(
            "r4", "Luxury Bistro",
            metadata={"price_level": 4},
            group_score=0.90,
        )
        constraints = Constraints(
            category=Category.RESTAURANTS,
            budget_band=BudgetBand.LOW,  # expects price_level 1
        )

        passed, filtered = engine.apply_all([expensive], constraints)
        assert len(passed) == 1
        assert len(filtered) == 0
        # Soft penalty should decrease score
        assert passed[0].group_score < 0.90
        assert any(c.status == ConstraintStatus.WARNING for c in passed[0].constraint_results)

    def test_energy_mismatch_applies_warning(self):
        engine = ConstraintEngine()
        arcade = _make_candidate(
            "r5", "Action Thriller Show",
            entity_type="movie",
            tags=["action", "thriller", "intense"],
            group_score=0.88,
        )
        constraints = Constraints(
            category=Category.MOVIES,
            energy_level=EnergyLevel.LOW,  # Mismatch with intense movie
        )

        passed, filtered = engine.apply_all([arcade], constraints)
        assert len(passed) == 1
        assert passed[0].group_score < 0.88
        assert any(c.status == ConstraintStatus.WARNING for c in passed[0].constraint_results)

    def test_time_limit_exceeded_applies_penalty(self):
        engine = ConstraintEngine()
        long_movie = _make_candidate(
            "m3", "Oppenheimer",
            entity_type="movie",
            tags=["movie", "drama"],
            metadata={"runtime_min": 180},
            group_score=0.85,
        )
        constraints = Constraints(
            category=Category.MOVIES,
            time_available=TimeAvailable.SHORT,  # max 90 min
        )

        passed, filtered = engine.apply_all([long_movie], constraints)
        assert len(passed) == 1
        assert passed[0].group_score < 0.85

    def test_wheelchair_mobility_soft_handling(self):
        engine = ConstraintEngine()
        walk = _make_candidate(
            "r6", "Historic Walking Tour",
            tags=["walking_tour", "stairs"],
            group_score=0.80,
        )
        constraints = Constraints(
            category=Category.RESTAURANTS,
            mobility_notes="wheelchair accessible needed",
        )

        passed, filtered = engine.apply_all([walk], constraints)
        assert len(passed) == 1
        # Accessibility unverified or warning badge
        assert any(c.status in (ConstraintStatus.WARNING, ConstraintStatus.UNVERIFIED) for c in passed[0].constraint_results)
