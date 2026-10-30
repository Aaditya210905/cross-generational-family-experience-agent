"""
FusionAI — Constraint Engine

Deterministic filtering applied AFTER retrieval and scoring.
Qloo doesn't guarantee prices, hours, accessibility, or ingredients,
so we apply our own rules.

Constraint Types:
    HARD → item removed entirely (dietary restrictions, at-home, category)
    SOFT → score penalty + warning badge (budget, energy, time, mobility)
    UNVERIFIED → "please check" badge when we can't verify

IMPORTANT: No LLM is used for constraint pass/fail decisions.
All rules are deterministic and keyword-based.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

from contracts.models import (
    ConstraintResult,
    Constraints,
    ConstraintStatus,
    ConstraintType,
    ScoredCandidate,
)


# ─── Keyword Mappings ────────────────────────────────────────────────────────
# These are maintained by us, not derived from Qloo.

ENERGY_LEVEL_TAGS: Dict[str, set] = {
    "low": {
        "museum", "movie_theater", "cinema", "cafe", "library", "gallery",
        "quiet", "relaxing", "seated", "calm", "peaceful", "tea_house",
        "movie", "film", "drama",
    },
    "medium": {
        "restaurant", "park", "bowling", "escape_room", "shopping",
        "walking_tour", "zoo", "aquarium", "garden", "market",
        "comedy", "adventure", "family",
    },
    "high": {
        "hiking", "arcade", "sports", "amusement_park", "rock_climbing",
        "dancing", "karaoke", "trampoline", "water_park", "roller_coaster",
        "action", "thriller", "intense",
    },
}

BUDGET_LEVEL_MAP: Dict[str, set] = {
    "low": {1},       # price_level 1
    "medium": {1, 2, 3},
    "high": {1, 2, 3, 4},
}

TIME_LIMITS: Dict[str, int] = {
    "short": 90,     # max runtime/duration in minutes
    "medium": 180,
    "long": 999,
}

DIETARY_TAG_MAP: Dict[str, set] = {
    "vegetarian": {
        "vegetarian", "vegan", "vegetarian_friendly", "vegetarian-friendly",
        "plant_based", "veggie",
    },
    "vegan": {
        "vegan", "plant_based", "vegan_friendly", "vegan-friendly",
    },
    "gluten_free": {
        "gluten_free", "gluten-free", "celiac_friendly",
    },
    "halal": {
        "halal", "halal_certified",
    },
    "kosher": {
        "kosher", "kosher_certified",
    },
    "pescatarian": {
        "pescatarian", "pescatarian_friendly", "seafood", "fish",
    },
    "dairy_free": {
        "dairy_free", "dairy-free", "lactose_free",
    },
}

# Tags that indicate a non-vegetarian-ONLY item (should be filtered for vegetarians)
NON_VEG_ONLY_TAGS = {
    "bbq", "meat", "non_vegetarian", "steakhouse", "butcher",
    "meat_heavy", "carnivore", "grill",
}

MOBILITY_CONCERN_TAGS = {
    "wheelchair_accessible", "accessible", "elevator", "ground_floor",
    "step_free", "disability_friendly",
}


class ConstraintEngine:
    """
    Applies deterministic constraints to scored candidates.

    Hard constraints → remove item
    Soft constraints → score penalty + warning
    Unverified → badge only
    """

    SOFT_PENALTY = 0.08  # Score reduction per soft violation

    def apply_all(
        self,
        candidates: List[ScoredCandidate],
        constraints: Constraints,
    ) -> Tuple[List[ScoredCandidate], List[ScoredCandidate]]:
        """
        Apply all constraints to candidates.

        Returns:
            (passed, filtered) — candidates that passed and those removed
        """
        passed: List[ScoredCandidate] = []
        filtered: List[ScoredCandidate] = []

        for candidate in candidates:
            results, score_penalty, hard_fail = self._evaluate(candidate, constraints)

            # Attach constraint results to the candidate
            candidate.constraint_results = results

            if hard_fail:
                filtered.append(candidate)
            else:
                # Apply soft penalty to group score
                if score_penalty > 0:
                    candidate.group_score = max(0.0, round(
                        candidate.group_score - score_penalty, 4
                    ))
                passed.append(candidate)

        # Re-sort after penalties
        passed.sort(key=lambda c: c.group_score, reverse=True)
        return passed, filtered

    async def apply_all_async(
        self,
        candidates: List[ScoredCandidate],
        constraints: Constraints,
    ) -> Tuple[List[ScoredCandidate], List[ScoredCandidate]]:
        """
        Apply all constraints deterministically, then use LLM to resolve
        any UNVERIFIED flags on top candidates.
        """
        passed, filtered = self.apply_all(candidates, constraints)

        from backend.llm import is_llm_available, evaluate_constraint_with_llm

        if is_llm_available():
            # Only check Mobility with LLM if family explicitly noted mobility requirements
            if constraints.mobility_notes:
                for c in passed[:4]:
                    for i, cr in enumerate(c.constraint_results):
                        if cr.status == ConstraintStatus.UNVERIFIED and cr.constraint_name == "Mobility":
                            try:
                                val = constraints.mobility_notes
                                eval_res = await evaluate_constraint_with_llm(
                                    name=c.entity.name,
                                    entity_type=c.entity.type,
                                    tags=c.tags,
                                    constraint_name=cr.constraint_name,
                                    constraint_value=val or "standard",
                                )
                                if eval_res and eval_res.get("status") in ("pass", "warning", "fail"):
                                    c.constraint_results[i] = ConstraintResult(
                                        constraint_name=cr.constraint_name,
                                        constraint_type=cr.constraint_type,
                                        status=ConstraintStatus(eval_res["status"]),
                                        message=eval_res["reason"],
                                    )
                            except Exception as e:
                                logger.debug(f"LLM constraint check skipped: {e}")

        return passed, filtered

    def _evaluate(
        self,
        candidate: ScoredCandidate,
        constraints: Constraints,
    ) -> Tuple[List[ConstraintResult], float, bool]:
        """Evaluate all constraints for a single candidate."""
        results: List[ConstraintResult] = []
        total_penalty = 0.0
        hard_fail = False

        # ── Hard Constraints ─────────────────────────────────────────────

        # 1. Category check
        cat_result = self._check_category(candidate, constraints)
        if cat_result:
            results.append(cat_result)
            if cat_result.status == ConstraintStatus.FAIL:
                hard_fail = True

        # 2. Dietary restrictions
        diet_results = self._check_dietary(candidate, constraints)
        for dr in diet_results:
            results.append(dr)
            if dr.status == ConstraintStatus.FAIL:
                hard_fail = True

        # 3. At-home check
        home_result = self._check_at_home(candidate, constraints)
        if home_result:
            results.append(home_result)
            if home_result.status == ConstraintStatus.FAIL:
                hard_fail = True

        # ── Soft Constraints ─────────────────────────────────────────────

        # 4. Budget
        budget_result = self._check_budget(candidate, constraints)
        if budget_result:
            results.append(budget_result)
            if budget_result.status == ConstraintStatus.WARNING:
                total_penalty += self.SOFT_PENALTY

        # 5. Energy level
        energy_result = self._check_energy(candidate, constraints)
        if energy_result:
            results.append(energy_result)
            if energy_result.status == ConstraintStatus.WARNING:
                total_penalty += self.SOFT_PENALTY

        # 6. Time available
        time_result = self._check_time(candidate, constraints)
        if time_result:
            results.append(time_result)
            if time_result.status == ConstraintStatus.WARNING:
                total_penalty += self.SOFT_PENALTY

        # 7. Mobility
        mobility_result = self._check_mobility(candidate, constraints)
        if mobility_result:
            results.append(mobility_result)
            if mobility_result.status == ConstraintStatus.WARNING:
                total_penalty += self.SOFT_PENALTY

        return results, total_penalty, hard_fail

    # ─── Hard Constraint Checks ──────────────────────────────────────────

    def _check_category(
        self, candidate: ScoredCandidate, constraints: Constraints,
    ) -> Optional[ConstraintResult]:
        """Items must match the requested category."""
        entity_type = candidate.entity.type.lower()
        category = constraints.category.value.lower()

        # Movies category allows: movie, film, show, series, urn:entity:movie
        movie_types = {"movie", "film", "show", "series", "documentary", "urn:entity:movie"}
        restaurant_types = {"restaurant", "cafe", "bar", "food", "cuisine", "eatery", "urn:entity:restaurant", "urn:entity:place"}

        is_movie = any(t in entity_type for t in ["movie", "film", "show", "series", "documentary"])
        is_restaurant = any(t in entity_type for t in ["restaurant", "cafe", "food", "cuisine", "place"])

        if category == "movies" and (is_movie or entity_type in movie_types):
            return ConstraintResult(
                constraint_name="Category",
                constraint_type=ConstraintType.HARD,
                status=ConstraintStatus.PASS,
                message=f"Matches category: {category}",
            )
        elif category == "restaurants" and entity_type in restaurant_types:
            return ConstraintResult(
                constraint_name="Category",
                constraint_type=ConstraintType.HARD,
                status=ConstraintStatus.PASS,
                message=f"Matches category: {category}",
            )
        elif entity_type not in movie_types and entity_type not in restaurant_types:
            # Unknown type — pass but note
            return ConstraintResult(
                constraint_name="Category",
                constraint_type=ConstraintType.HARD,
                status=ConstraintStatus.UNVERIFIED,
                message=f"Unknown entity type '{entity_type}', cannot verify category",
            )
        elif (category == "movies" and entity_type in restaurant_types) or \
             (category == "restaurants" and entity_type in movie_types):
            return ConstraintResult(
                constraint_name="Category",
                constraint_type=ConstraintType.HARD,
                status=ConstraintStatus.FAIL,
                message=f"Wrong category: '{entity_type}' doesn't match '{category}'",
            )
        return None

    def _check_dietary(
        self, candidate: ScoredCandidate, constraints: Constraints,
    ) -> List[ConstraintResult]:
        """Check dietary restrictions against candidate tags."""
        results = []
        if not constraints.dietary:
            return results

        candidate_tags = set(t.lower() for t in candidate.tags)
        metadata = candidate.metadata or {}

        for diet in constraints.dietary:
            diet_lower = diet.lower().strip()

            # For movies, dietary constraints don't apply
            if candidate.entity.type.lower() in {"movie", "film", "show", "series"}:
                results.append(ConstraintResult(
                    constraint_name=f"Dietary: {diet}",
                    constraint_type=ConstraintType.HARD,
                    status=ConstraintStatus.PASS,
                    message="Not applicable for this category",
                ))
                continue

            # Check if metadata explicitly flags dietary compatibility
            friendly_key = f"{diet_lower}_friendly"
            if friendly_key in metadata:
                if metadata[friendly_key]:
                    results.append(ConstraintResult(
                        constraint_name=f"Dietary: {diet}",
                        constraint_type=ConstraintType.HARD,
                        status=ConstraintStatus.PASS,
                        message=f"Confirmed {diet}-friendly",
                    ))
                else:
                    results.append(ConstraintResult(
                        constraint_name=f"Dietary: {diet}",
                        constraint_type=ConstraintType.HARD,
                        status=ConstraintStatus.FAIL,
                        message=f"Not {diet}-friendly",
                    ))
                continue

            # Check for non-veg-only tags if dietary is vegetarian/vegan
            if diet_lower in {"vegetarian", "vegan"}:
                if candidate_tags & NON_VEG_ONLY_TAGS:
                    results.append(ConstraintResult(
                        constraint_name=f"Dietary: {diet}",
                        constraint_type=ConstraintType.HARD,
                        status=ConstraintStatus.FAIL,
                        message=f"Contains non-{diet} items (tags: {candidate_tags & NON_VEG_ONLY_TAGS})",
                    ))
                    continue

            # Check for positive dietary tags
            diet_tags = DIETARY_TAG_MAP.get(diet_lower, set())
            if candidate_tags & diet_tags:
                results.append(ConstraintResult(
                    constraint_name=f"Dietary: {diet}",
                    constraint_type=ConstraintType.HARD,
                    status=ConstraintStatus.PASS,
                    message=f"Has {diet}-compatible tags",
                ))
            else:
                # Can't verify — unverified badge
                results.append(ConstraintResult(
                    constraint_name=f"Dietary: {diet}",
                    constraint_type=ConstraintType.HARD,
                    status=ConstraintStatus.UNVERIFIED,
                    message=f"Cannot verify {diet} compatibility — please check",
                ))

        return results

    def _check_at_home(
        self, candidate: ScoredCandidate, constraints: Constraints,
    ) -> Optional[ConstraintResult]:
        """If location is 'at_home', only allow movies/streaming, not venues."""
        if not constraints.location or constraints.location.lower() != "at_home":
            return None

        entity_type = candidate.entity.type.lower()
        at_home_types = {"movie", "film", "show", "series", "documentary"}

        if entity_type in at_home_types:
            return ConstraintResult(
                constraint_name="At Home",
                constraint_type=ConstraintType.HARD,
                status=ConstraintStatus.PASS,
                message="Suitable for home viewing",
            )
        else:
            return ConstraintResult(
                constraint_name="At Home",
                constraint_type=ConstraintType.HARD,
                status=ConstraintStatus.FAIL,
                message="Requires going out — family chose 'at home'",
            )

    # ─── Soft Constraint Checks ──────────────────────────────────────────

    def _check_budget(
        self, candidate: ScoredCandidate, constraints: Constraints,
    ) -> Optional[ConstraintResult]:
        """Check price level against budget band."""
        if constraints.budget_band.value == "any":
            return None

        price_level = candidate.metadata.get("price_level")
        if price_level is None:
            return ConstraintResult(
                constraint_name="Budget",
                constraint_type=ConstraintType.SOFT,
                status=ConstraintStatus.UNVERIFIED,
                message="No price information available — please check",
            )

        allowed = BUDGET_LEVEL_MAP.get(constraints.budget_band.value, {1, 2, 3, 4})
        if price_level in allowed:
            labels = {1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}
            return ConstraintResult(
                constraint_name="Budget",
                constraint_type=ConstraintType.SOFT,
                status=ConstraintStatus.PASS,
                message=f"Price level: {labels.get(price_level, '?')} — within budget",
            )
        else:
            return ConstraintResult(
                constraint_name="Budget",
                constraint_type=ConstraintType.SOFT,
                status=ConstraintStatus.WARNING,
                message=f"Price level {price_level} may exceed '{constraints.budget_band.value}' budget",
            )

    def _check_energy(
        self, candidate: ScoredCandidate, constraints: Constraints,
    ) -> Optional[ConstraintResult]:
        """Check energy level compatibility via tag matching."""
        if constraints.energy_level.value == "any":
            return None

        candidate_tags = set(t.lower() for t in candidate.tags)
        desired = constraints.energy_level.value

        # Check if any tags match higher energy levels
        if desired == "low":
            high_tags = candidate_tags & ENERGY_LEVEL_TAGS.get("high", set())
            if high_tags:
                return ConstraintResult(
                    constraint_name="Energy Level",
                    constraint_type=ConstraintType.SOFT,
                    status=ConstraintStatus.WARNING,
                    message=f"May be high-energy (tags: {', '.join(list(high_tags)[:3])})",
                )
        elif desired == "high":
            low_tags = candidate_tags & ENERGY_LEVEL_TAGS.get("low", set())
            if low_tags and not (candidate_tags & ENERGY_LEVEL_TAGS.get("high", set())):
                return ConstraintResult(
                    constraint_name="Energy Level",
                    constraint_type=ConstraintType.SOFT,
                    status=ConstraintStatus.WARNING,
                    message=f"May be low-energy (tags: {', '.join(list(low_tags)[:3])})",
                )

        return ConstraintResult(
            constraint_name="Energy Level",
            constraint_type=ConstraintType.SOFT,
            status=ConstraintStatus.PASS,
            message=f"Compatible with '{desired}' energy preference",
        )

    def _check_time(
        self, candidate: ScoredCandidate, constraints: Constraints,
    ) -> Optional[ConstraintResult]:
        """Check runtime/duration against available time."""
        if constraints.time_available.value == "any":
            return None

        runtime = candidate.metadata.get("runtime_min")
        if runtime is None:
            return ConstraintResult(
                constraint_name="Time",
                constraint_type=ConstraintType.SOFT,
                status=ConstraintStatus.UNVERIFIED,
                message="Duration unknown — please check",
            )

        max_minutes = TIME_LIMITS.get(constraints.time_available.value, 999)
        if runtime <= max_minutes:
            return ConstraintResult(
                constraint_name="Time",
                constraint_type=ConstraintType.SOFT,
                status=ConstraintStatus.PASS,
                message=f"Duration: {runtime} min — fits '{constraints.time_available.value}' time",
            )
        else:
            return ConstraintResult(
                constraint_name="Time",
                constraint_type=ConstraintType.SOFT,
                status=ConstraintStatus.WARNING,
                message=f"Duration: {runtime} min — may be too long for '{constraints.time_available.value}' time ({max_minutes} min max)",
            )

    def _check_mobility(
        self, candidate: ScoredCandidate, constraints: Constraints,
    ) -> Optional[ConstraintResult]:
        """Check mobility/accessibility needs."""
        if not constraints.mobility_notes:
            return None

        mobility_lower = constraints.mobility_notes.lower()
        needs_accessible = any(
            kw in mobility_lower
            for kw in ["wheelchair", "accessible", "mobility", "walker", "cane", "limited"]
        )

        if not needs_accessible:
            return None

        # Movies are inherently seated/accessible
        if candidate.entity.type.lower() in {"movie", "film", "show", "series"}:
            return ConstraintResult(
                constraint_name="Mobility",
                constraint_type=ConstraintType.SOFT,
                status=ConstraintStatus.PASS,
                message="Seated activity — accessible",
            )

        candidate_tags = set(t.lower() for t in candidate.tags)
        if candidate_tags & MOBILITY_CONCERN_TAGS:
            return ConstraintResult(
                constraint_name="Mobility",
                constraint_type=ConstraintType.SOFT,
                status=ConstraintStatus.PASS,
                message="Accessibility features indicated",
            )

        # Can't verify accessibility
        return ConstraintResult(
            constraint_name="Mobility",
            constraint_type=ConstraintType.SOFT,
            status=ConstraintStatus.UNVERIFIED,
            message="Accessibility unverified — please check before visiting",
        )
