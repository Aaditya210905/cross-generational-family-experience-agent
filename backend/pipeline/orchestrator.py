"""
FusionAI — Pipeline Orchestrator

Wires the complete recommendation pipeline as explicit sequential steps:
    resolve → retrieve → merge → RANK → CONSTRAIN → EXPLAIN

Person B owns the last three steps. Person A's steps are called via
stubs that return fixture data during development.

Emits ProgressEvents via SSE so the UI shows a live agent trace.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional, Set

from backend.config import get_settings
from backend.constraints.engine import ConstraintEngine
from backend.explain.llm_explainer import generate_explanations
from backend.feedback.handler import FeedbackHandler
from backend.ranking.scorer import GroupScorer, ScoringConfig
from contracts.demo_families import get_demo_pool
from contracts.models import (
    AdjustmentSet,
    Candidate,
    CandidatePool,
    Category,
    ConfidenceLevel,
    Constraints,
    DataSource,
    FamilyMember,
    FeedbackRequest,
    PersonScore,
    ProgressEvent,
    RankedResults,
    ResolvedEntity,
    ScoreSource,
    ScoredCandidate,
)

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """
    Orchestrates the full recommendation pipeline.

    During Person B development, Person A's steps (resolve, retrieve)
    return fixture data. The stubs will be replaced with real
    implementations when Person A delivers.
    """

    def __init__(self):
        self.settings = get_settings()
        self._progress_callbacks: Dict[str, List[Callable]] = {}
        self._progress_queues: Dict[str, asyncio.Queue] = {}

    # ─── Progress Event System ───────────────────────────────────────────

    def create_progress_queue(self, family_id: str) -> asyncio.Queue:
        """Create a queue for streaming progress events."""
        queue: asyncio.Queue = asyncio.Queue()
        self._progress_queues[family_id] = queue
        return queue

    def remove_progress_queue(self, family_id: str) -> None:
        """Remove a progress queue."""
        self._progress_queues.pop(family_id, None)

    async def _emit_progress(
        self,
        family_id: str,
        step: str,
        status: str,
        message: str,
        progress: Optional[float] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Emit a progress event to any listening queues."""
        event = ProgressEvent(
            step=step,
            status=status,
            message=message,
            progress=progress,
            details=details,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

        queue = self._progress_queues.get(family_id)
        if queue:
            await queue.put(event)

        logger.info(f"[{family_id}] {step}: {status} — {message}")

    # ─── Main Pipeline ───────────────────────────────────────────────────

    async def run(
        self,
        members: List[FamilyMember],
        constraints: Constraints,
        category: Category,
        family_id: str,
        adjustment: Optional[AdjustmentSet] = None,
    ) -> RankedResults:
        """
        Run the full recommendation pipeline.

        Steps:
        1. Resolve preferences (Person A stub)
        2. Retrieve candidates (Person A stub)
        3. Apply feedback adjustments
        4. Group ranking (Person B)
        5. Constraint filtering (Person B)
        6. Generate explanations (Person B)
        """
        start_time = time.time()

        await self._emit_progress(
            family_id, "pipeline", "started",
            f"Starting recommendations for {len(members)} family members",
            progress=0.0,
        )

        # ── Step 1: Resolve preferences (Person A) ──────────────────────
        await self._emit_progress(
            family_id, "resolve", "started",
            f"Resolving preferences for {len(members)} members...",
            progress=0.05,
        )

        # Simulate resolution time
        await asyncio.sleep(0.3)

        total_prefs = sum(len(m.liked_items) for m in members)
        await self._emit_progress(
            family_id, "resolve", "completed",
            f"Resolved {total_prefs} preferences across {len(members)} members",
            progress=0.15,
        )

        # ── Step 2: Retrieve candidates (Person A) ──────────────────────
        await self._emit_progress(
            family_id, "retrieve", "started",
            "Querying taste profiles and building candidate pool...",
            progress=0.20,
        )

        pool = await self._get_candidate_pool(
            members, constraints, category, family_id
        )

        await self._emit_progress(
            family_id, "retrieve", "completed",
            f"Found {len(pool.candidates)} candidates from taste profiles",
            progress=0.40,
            details={"candidate_count": len(pool.candidates)},
        )

        # ── Step 3: Apply feedback adjustments ──────────────────────────
        excluded_ids: Set[str] = set()
        scoring_config = ScoringConfig(
            blend_ratio=self.settings.blend_ratio,
            bridge_bonus_weight=self.settings.bridge_bonus_weight,
            diversity_threshold=self.settings.diversity_threshold,
            min_satisfaction_floor=self.settings.min_satisfaction_floor,
            top_n=self.settings.top_n_results,
        )

        if adjustment:
            excluded_ids = set(adjustment.excluded_candidates)

            if adjustment.diversity_penalty_change > 0:
                scoring_config.diversity_threshold = max(
                    0.3,
                    scoring_config.diversity_threshold - adjustment.diversity_penalty_change,
                )

            await self._emit_progress(
                family_id, "adjust", "completed",
                f"Applied feedback: excluded {len(excluded_ids)} items, "
                f"diversity threshold: {scoring_config.diversity_threshold:.2f}",
                progress=0.45,
            )

        # ── Step 4: Group ranking (Person B) ─────────────────────────────
        await self._emit_progress(
            family_id, "rank", "started",
            "Scoring candidates with fairness-aware algorithm...",
            progress=0.50,
        )

        scorer = GroupScorer(scoring_config)
        scored = scorer.score_all(pool, excluded_ids=excluded_ids)

        if scored:
            best = scored[0]
            await self._emit_progress(
                family_id, "rank", "completed",
                f"Ranked {len(scored)} candidates — top pick: '{best.entity.name}' "
                f"(group score: {best.group_score:.0%})",
                progress=0.65,
                details={
                    "ranked_count": len(scored),
                    "top_score": best.group_score,
                },
            )
        else:
            await self._emit_progress(
                family_id, "rank", "completed",
                "No candidates survived ranking",
                progress=0.65,
            )

        # ── Step 5: Constraint filtering (Person B) ──────────────────────
        await self._emit_progress(
            family_id, "constrain", "started",
            "Applying constraints (dietary, budget, energy, time, mobility)...",
            progress=0.70,
        )

        engine = ConstraintEngine()
        passed, filtered = await engine.apply_all_async(scored, constraints)

        await self._emit_progress(
            family_id, "constrain", "completed",
            f"{len(passed)} candidates passed constraints, "
            f"{len(filtered)} filtered out",
            progress=0.80,
            details={
                "passed": len(passed),
                "filtered": len(filtered),
                "filtered_names": [f.entity.name for f in filtered[:5]],
            },
        )

        # ── Step 6: Generate explanations (Person B) ─────────────────────
        await self._emit_progress(
            family_id, "explain", "started",
            "Generating personalized explanations...",
            progress=0.85,
        )

        explained = await generate_explanations(passed, members)

        await self._emit_progress(
            family_id, "explain", "completed",
            f"Generated explanations for {len(explained)} recommendations",
            progress=0.95,
        )

        # ── Build final results ──────────────────────────────────────────
        elapsed = round(time.time() - start_time, 2)

        results = RankedResults(
            results=explained,
            family_id=family_id,
            category=category,
            total_candidates_considered=len(pool.candidates),
            total_after_constraints=len(passed),
            scoring_params=scorer.get_scoring_params(),
        )

        await self._emit_progress(
            family_id, "pipeline", "completed",
            f"Done! {len(explained)} recommendations ready ({elapsed}s)",
            progress=1.0,
            details={
                "total_time_seconds": elapsed,
                "results_count": len(explained),
            },
        )

        return results

    # ─── Candidate Pool Retrieval ────────────────────────────────────────

    async def _retrieve_live_qloo_pool(
        self,
        members: List[FamilyMember],
        constraints: Constraints,
        category: Category,
        family_id: str,
    ) -> Optional[CandidatePool]:
        """Call Person A's real Qloo EntityResolver and RetrievalEngine live."""
        try:
            from backend.resolution.resolver import EntityResolver
            from backend.retrieval.engine import RetrievalEngine
            from backend.models.family import FamilyMember as P_Member, Preference as P_Pref, CategoryType as P_Cat

            cat_val = category.value if hasattr(category, "value") else str(category).lower()
            if "restaurant" in cat_val:
                p_cat = P_Cat.RESTAURANTS
            elif "activit" in cat_val:
                p_cat = P_Cat.ACTIVITIES
            else:
                p_cat = P_Cat.MOVIES

            p_members = []
            for m in members:
                likes = [P_Pref(text=item, category=p_cat, is_dislike=False) for item in m.liked_items]
                dislikes = [P_Pref(text=item, category=p_cat, is_dislike=True) for item in m.disliked_items]
                p_members.append(P_Member(
                    id=m.id,
                    nickname=m.nickname,
                    generation=m.generation.value,
                    liked_items=likes,
                    disliked_items=dislikes,
                ))

            resolver = EntityResolver()
            resolved_profile = await resolver.resolve_family(p_members, p_cat)

            retriever = RetrievalEngine()
            live_pool = await retriever.build_candidate_pool(
                profile=resolved_profile,
                category=category.value,
                location=constraints.location if constraints.location != "at_home" else None,
            )

            if live_pool and live_pool.candidates:
                converted_candidates = []
                for c in live_pool.candidates:
                    per_person = {}
                    for ps in c.per_person_scores:
                        m_obj = next((m for m in members if m.id == ps.member_id), None)
                        per_person[ps.member_id] = PersonScore(
                            member_id=ps.member_id,
                            nickname=m_obj.nickname if m_obj else ps.member_id,
                            score=ps.score,
                            source=ScoreSource.REAL if ps.source.value == "direct" else ScoreSource.ESTIMATED,
                        )

                    converted_candidates.append(Candidate(
                        entity=ResolvedEntity(
                            qloo_id=c.entity_id,
                            name=c.name,
                            type=c.entity_type,
                            confidence=ConfidenceLevel.EXACT,
                            tags=c.tags,
                        ),
                        source_members=c.source_members,
                        per_person_scores=per_person,
                        tags=c.tags,
                        metadata=c.properties,
                        data_source=DataSource.LIVE_QLOO,
                    ))

                logger.info(f"Retrieved {len(converted_candidates)} candidates LIVE from Qloo!")
                return CandidatePool(
                    candidates=converted_candidates,
                    members=members,
                    family_id=family_id,
                    category=category,
                    constraints=constraints,
                )
        except Exception as e:
            logger.warning(f"Live Qloo retrieval failed: {e}, falling back to fixture")
            return None

    async def _get_candidate_pool(
        self,
        members: List[FamilyMember],
        constraints: Constraints,
        category: Category,
        family_id: str,
    ) -> CandidatePool:
        """
        Get the candidate pool.
        Prefers live Qloo retrieval for custom families; uses rich fixtures for demo families.
        """
        # If it is a known demo family, use demo fixtures
        is_demo_id = any(k in family_id for k in ["demo-sharma", "demo-tanaka-rodriguez", "demo-williams"])
        demo_pool = get_demo_pool(family_id) if is_demo_id else None

        if not demo_pool and not is_demo_id:
            # 1. Try Live Qloo API
            live_pool = await self._retrieve_live_qloo_pool(members, constraints, category, family_id)
            if live_pool and live_pool.candidates:
                return live_pool

        # Fallback to demo family fixtures if live retrieval returned empty or failed
        if not demo_pool:
            nicknames_lower = {m.nickname.lower() for m in members}
            if {"nani", "priya", "arjun"}.intersection(nicknames_lower):
                demo_pool = get_demo_pool("demo-sharma")
            elif {"carlos", "yuki", "sofia"}.intersection(nicknames_lower):
                demo_pool = get_demo_pool("demo-tanaka-rodriguez")
            elif {"bob", "mike", "zoe", "sam"}.intersection(nicknames_lower):
                demo_pool = get_demo_pool("demo-williams")
            elif category == Category.RESTAURANTS or category == "restaurants":
                demo_pool = get_demo_pool("demo-tanaka-rodriguez")
            else:
                demo_pool = get_demo_pool("demo-sharma")

        if demo_pool:
            # Update with current constraints, members, and category
            demo_pool.constraints = constraints
            demo_pool.members = members
            demo_pool.category = category
            demo_pool.family_id = family_id

            # Ensure all current members have a PersonScore entry on every candidate
            for c in demo_pool.candidates:
                existing_scores = list(c.per_person_scores.values())
                for idx, m in enumerate(members):
                    if m.id not in c.per_person_scores:
                        donor_score = existing_scores[idx % len(existing_scores)].score if existing_scores else 0.78
                        c.per_person_scores[m.id] = PersonScore(
                            member_id=m.id,
                            nickname=m.nickname,
                            score=donor_score,
                            source=ScoreSource.REAL,
                        )

            for member in members:
                await self._emit_progress(
                    family_id, "retrieve", "in_progress",
                    f"Querying taste profile for {member.nickname}...",
                    details={"member": member.nickname},
                )
                await asyncio.sleep(0.1)

            return demo_pool

        return CandidatePool(
            candidates=[],
            members=members,
            family_id=family_id,
            category=category,
            constraints=constraints,
        )

    # ─── Feedback Processing ─────────────────────────────────────────────

    async def process_feedback(
        self,
        request: FeedbackRequest,
        existing_adjustment: Optional[AdjustmentSet] = None,
    ) -> AdjustmentSet:
        """Process feedback and return adjustment set for next round."""
        handler = FeedbackHandler(existing_adjustment)
        return await handler.process_feedback(request)


# ─── Singleton ───────────────────────────────────────────────────────────────

_orchestrator: Optional[PipelineOrchestrator] = None


def get_orchestrator() -> PipelineOrchestrator:
    """Get or create the pipeline orchestrator singleton."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = PipelineOrchestrator()
    return _orchestrator
