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
import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

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
    TasteItem,
    coerce_taste_items,
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
        self._progress_hubs: Dict[str, "_ProgressHub"] = {}
        self._in_flight: Dict[str, asyncio.Future] = {}
        self._dedupe_lock = asyncio.Lock()

    # ─── Progress Event System ───────────────────────────────────────────

    def subscribe_progress(self, family_id: str) -> asyncio.Queue:
        """Subscribe to pipeline events, replaying anything already emitted."""
        hub = self._progress_hubs.get(family_id)
        if hub is None:
            hub = _ProgressHub()
            self._progress_hubs[family_id] = hub
        return hub.subscribe()

    def unsubscribe_progress(self, family_id: str, queue: asyncio.Queue) -> None:
        hub = self._progress_hubs.get(family_id)
        if hub:
            hub.unsubscribe(queue)
            if hub.idle:
                self._progress_hubs.pop(family_id, None)

    def create_progress_queue(self, family_id: str) -> asyncio.Queue:
        """Back-compat alias used by the SSE route."""
        return self.subscribe_progress(family_id)

    def remove_progress_queue(self, family_id: str) -> None:
        self._progress_hubs.pop(family_id, None)

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

        hub = self._progress_hubs.get(family_id)
        if hub is None:
            hub = _ProgressHub()
            self._progress_hubs[family_id] = hub
        await hub.publish(event)

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
        run_key = self._run_fingerprint(
            family_id, members, constraints, category, adjustment
        )
        async with self._dedupe_lock:
            existing = self._in_flight.get(run_key)
            if existing is not None:
                shared = existing
            else:
                shared = None
                loop = asyncio.get_running_loop()
                future: asyncio.Future = loop.create_future()
                self._in_flight[run_key] = future

        if shared is not None:
            return await shared

        try:
            result = await self._run_impl(
                members, constraints, category, family_id, adjustment
            )
            if not future.done():
                future.set_result(result)
            return result
        except Exception as exc:
            if not future.done():
                future.set_exception(exc)
            raise
        finally:
            self._in_flight.pop(run_key, None)

    async def _run_impl(
        self,
        members: List[FamilyMember],
        constraints: Constraints,
        category: Category,
        family_id: str,
        adjustment: Optional[AdjustmentSet] = None,
    ) -> RankedResults:
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
            members, constraints, category, family_id, adjustment=adjustment
        )

        await self._emit_progress(
            family_id, "retrieve", "completed",
            f"Found {len(pool.candidates)} candidates from taste profiles",
            progress=0.40,
            details={"candidate_count": len(pool.candidates)},
        )

        # ── Step 3: Apply feedback adjustments ──────────────────────────
        await self._emit_progress(
            family_id, "adjust", "started",
            "Checking previous-round feedback for exclusions and diversity weights...",
            progress=0.42,
        )

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
        else:
            await self._emit_progress(
                family_id, "adjust", "completed",
                "No prior feedback this round — ranking with default weights",
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
        adjustment: Optional[AdjustmentSet] = None,
    ) -> Optional[CandidatePool]:
        """Call Person A's real Qloo EntityResolver and RetrievalEngine live."""
        try:
            from backend.resolution.resolver import EntityResolver
            from backend.retrieval.engine import RetrievalEngine
            from backend.models.family import FamilyMember as P_Member, Preference as P_Pref, CategoryType as P_Cat

            rec_cat = _match_category_type(
                category.value if hasattr(category, "value") else str(category),
                P_Cat,
            )

            p_members = []
            for m in members:
                likes = [
                    _to_person_a_pref(item, is_dislike=False, category_enum=P_Cat)
                    for item in coerce_taste_items(m.liked_items)
                ]
                dislikes = [
                    _to_person_a_pref(item, is_dislike=True, category_enum=P_Cat)
                    for item in coerce_taste_items(m.disliked_items)
                ]
                p_members.append(P_Member(
                    id=m.id,
                    nickname=m.nickname,
                    generation=m.generation.value,
                    liked_items=likes,
                    disliked_items=dislikes,
                ))

            resolver = EntityResolver()
            resolved_profile = await resolver.resolve_family(
                p_members,
                rec_cat or next(iter(P_Cat)),
            )

            retriever = RetrievalEngine()
            live_pool = await retriever.build_candidate_pool(
                profile=resolved_profile,
                category=category.value,
                location=constraints.location if constraints.location != "at_home" else None,
                adjustment=_to_retrieval_adjustment(adjustment),
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
        adjustment: Optional[AdjustmentSet] = None,
    ) -> CandidatePool:
        """
        Get the candidate pool.
        Prefers live Qloo retrieval for custom families; uses rich fixtures for demo families.
        """
        demo_pool = get_demo_pool(family_id)

        if not demo_pool:
            live_pool = await self._retrieve_live_qloo_pool(
                members, constraints, category, family_id, adjustment=adjustment
            )
            if live_pool and live_pool.candidates:
                return live_pool

            # Fallback to standard demo pools by category if live retrieval yielded nothing
            cat_str = str(category.value if hasattr(category, "value") else category).lower()
            if "restaurant" in cat_str:
                demo_pool = get_demo_pool("demo-tanaka-rodriguez")
            elif "activit" in cat_str:
                demo_pool = get_demo_pool("demo-williams")
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

    def _run_fingerprint(
        self,
        family_id: str,
        members: List[FamilyMember],
        constraints: Constraints,
        category: Category,
        adjustment: Optional[AdjustmentSet],
    ) -> str:
        payload = {
            "family_id": family_id,
            "category": getattr(category, "value", str(category)),
            "members": [m.model_dump() for m in members],
            "constraints": constraints.model_dump() if constraints else {},
            "adjustment": adjustment.model_dump() if adjustment else None,
        }
        raw = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(raw.encode()).hexdigest()


class _ProgressHub:
    """Fan-out buffer so SSE clients that connect late still see earlier steps."""

    def __init__(self) -> None:
        self.history: List[ProgressEvent] = []
        self._subscribers: List[asyncio.Queue] = []

    @property
    def idle(self) -> bool:
        return not self._subscribers

    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        for event in self.history:
            queue.put_nowait(event)
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        try:
            self._subscribers.remove(queue)
        except ValueError:
            pass

    async def publish(self, event: ProgressEvent) -> None:
        self.history.append(event)
        for queue in list(self._subscribers):
            await queue.put(event)


def _match_category_type(raw: Optional[str], enum_cls: Any) -> Optional[Any]:
    if not raw:
        return None
    needle = str(raw).strip().lower()
    for member in enum_cls:
        value = str(member.value).lower()
        if needle == value or needle == member.name.lower():
            return member
        if needle.rstrip("s") == value.rstrip("s"):
            return member
    return None


def _to_person_a_pref(item: TasteItem, is_dislike: bool, category_enum: Any):
    from backend.models.family import Preference as P_Pref

    mapped = _match_category_type(item.category, category_enum)
    return P_Pref(text=item.text, category=mapped, is_dislike=is_dislike)


def _to_retrieval_adjustment(adjustment: Optional[AdjustmentSet]):
    if not adjustment:
        return None
    from backend.models.common import AdjustmentSet as RetrievalAdjustment

    return RetrievalAdjustment(
        excluded_entity_ids=list(adjustment.excluded_candidates),
        additional_seed_entity_ids=list(adjustment.additional_seeds),
        diversity_penalty_boost=adjustment.diversity_penalty_change,
        additional_filters=dict(adjustment.filter_changes),
    )


# ─── Singleton ───────────────────────────────────────────────────────────────

_orchestrator: Optional[PipelineOrchestrator] = None


def get_orchestrator() -> PipelineOrchestrator:
    """Get or create the pipeline orchestrator singleton."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = PipelineOrchestrator()
    return _orchestrator
