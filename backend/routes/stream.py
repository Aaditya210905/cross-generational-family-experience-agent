"""
FusionAI — SSE Stream Route (Person B)

GET /api/stream/{family_id} — Server-Sent Events for pipeline progress

Emits progress events during recommendation generation so the UI
can show a live agent trace.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from backend.pipeline.orchestrator import get_orchestrator
from contracts.models import ProgressEvent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["streaming"])


@router.get("/stream/{family_id}")
async def stream_progress(family_id: str) -> EventSourceResponse:
    """
    Stream pipeline progress events via SSE.

    Events include:
    - Step name (resolve, retrieve, rank, constrain, explain)
    - Status (started, in_progress, completed, error)
    - Human-readable message
    - Progress percentage (0–1)
    - Optional details

    The frontend connects to this endpoint before calling /recommend.
    """
    orchestrator = get_orchestrator()
    queue = orchestrator.create_progress_queue(family_id)

    async def event_generator() -> AsyncGenerator[dict, None]:
        try:
            while True:
                try:
                    # Wait for events with a timeout
                    event = await asyncio.wait_for(queue.get(), timeout=120.0)

                    yield {
                        "event": "progress",
                        "data": event.model_dump_json(),
                    }

                    # If pipeline is complete, send done and close
                    if event.step == "pipeline" and event.status == "completed":
                        yield {
                            "event": "done",
                            "data": json.dumps({"status": "completed"}),
                        }
                        break

                    # If pipeline errored, send error and close
                    if event.status == "error":
                        yield {
                            "event": "error",
                            "data": json.dumps({
                                "error": event.message,
                                "step": event.step,
                            }),
                        }
                        break

                except asyncio.TimeoutError:
                    # Send keepalive
                    yield {
                        "event": "keepalive",
                        "data": json.dumps({"status": "waiting"}),
                    }

        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for {family_id}")
        finally:
            orchestrator.remove_progress_queue(family_id)

    return EventSourceResponse(event_generator())
