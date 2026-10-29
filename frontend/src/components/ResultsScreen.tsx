/**
 * FusionAI — Results Screen (Step 4)
 *
 * Full results experience integrating the multi-agent pipeline:
 * 1. Agent trace panel (live SSE progress & algorithm steps)
 * 2. Ranked recommendation cards with fairness breakdown
 * 3. Interactive feedback loop with live refinement
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useFamilyState } from "@/lib/store";
import {
  getRecommendations,
  submitFeedback,
  clearFeedback,
  connectProgressStream,
} from "@/lib/api";
import AgentTrace from "./AgentTrace";
import ResultCard from "./ResultCard";
import { SkeletonResults } from "./Skeletons";

interface ProgressEvent {
  step: string;
  status: string;
  message: string;
  progress?: number;
  details?: Record<string, unknown>;
}

export default function ResultsScreen() {
  const { state, dispatch } = useFamilyState();

  // Pipeline state
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [results, setResults] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [round, setRound] = useState(1);
  const eventSourceRef = useRef<EventSource | null>(null);

  const familyId = state.members.length > 0
    ? `family-${state.members.map((m) => m.nickname).join("-")}`.toLowerCase().replace(/\s+/g, "-")
    : "demo-family";

  // Run recommendation pipeline
  const runPipeline = useCallback(async (adjustment: unknown = null) => {
    setIsRunning(true);
    setError(null);
    setEvents([]);

    // Connect to SSE stream for live progress
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      eventSourceRef.current = connectProgressStream(
        familyId,
        (data) => setEvents((prev) => [...prev, data as ProgressEvent]),
        () => {
          // Soft warn without breaking results UI
          console.warn("SSE stream closed or disconnected");
        },
        () => {} // done handled by results payload
      );
    } catch {
      // Ignore stream setup failure
    }

    try {
      // Build family profile
      const familyProfile = {
        family_id: familyId,
        category: state.category || "movies",
        members: state.members.map((m) => ({
          nickname: m.nickname,
          generation: m.generation,
          avatar_emoji: m.avatar_emoji || "👤",
          liked_items: m.liked_items.map((item: { text: string } | string) =>
            typeof item === "string" ? item : item.text
          ),
          disliked_items: (m.disliked_items || []).map((item: { text: string } | string) =>
            typeof item === "string" ? item : item.text
          ),
        })),
        constraints: {
          budget_band: state.constraints?.budget || "any",
          energy_level: state.constraints?.energy_level || "any",
          location: state.constraints?.at_home ? "at_home" : (state.constraints?.location || null),
          dietary: state.constraints?.dietary_restrictions || [],
          mobility_notes: state.constraints?.mobility_notes || null,
          time_available: "any",
          category: state.category || "movies",
        },
      };

      const data = await getRecommendations(familyProfile, adjustment) as { results?: unknown[] };
      setResults(data?.results || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Pipeline encountered an issue";
      setError(message);
    } finally {
      setIsRunning(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  }, [familyId, state]);

  // Auto-run on mount
  useEffect(() => {
    runPipeline();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle feedback
  const handleFeedback = useCallback(async (
    entityId: string,
    entityName: string,
    reaction: string,
  ) => {
    setFeedbackMap((prev) => ({ ...prev, [entityId]: reaction }));

    try {
      const adjustment = await submitFeedback(
        familyId,
        [{ candidate_id: entityId, candidate_name: entityName, reaction }],
        results as unknown[],
      );

      setRound((r) => r + 1);
      await runPipeline(adjustment);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Feedback refinement failed";
      setError(message);
    }
  }, [familyId, results, runPipeline]);

  const handleStartOver = async () => {
    try {
      await clearFeedback(familyId);
    } catch {
      // ignore
    }
    dispatch({ type: "RESET" });
  };

  return (
    <div className="flex-1 flex flex-col px-4 py-8 relative z-10 max-w-4xl mx-auto w-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
              Round {round}
            </span>
            <span className="text-xs text-slate-400">
              {state.members.length} Cohort Members • {state.category}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
            {isRunning ? "Calculating Cross-Generational Consensus..." : "Consensus Recommendations"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => runPipeline()}
            disabled={isRunning}
            className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            🔄 Re-Run
          </button>
          <button
            onClick={handleStartOver}
            className="btn-secondary text-xs px-3.5 py-2 rounded-xl"
          >
            ← Start Over
          </button>
        </div>
      </div>

      {/* ── Agent Trace Panel ─────────────────────────────────────── */}
      {(isRunning || events.length > 0) && (
        <AgentTrace events={events} isRunning={isRunning} />
      )}

      {/* ── Error Banner ──────────────────────────────────────────── */}
      {error && (
        <div className="glass-card p-4 mb-6 border border-rose-500/30 bg-rose-500/10 flex items-center justify-between">
          <p className="text-rose-300 text-xs font-medium">⚠️ {error}</p>
          <button
            onClick={() => runPipeline()}
            className="text-xs font-bold text-rose-300 hover:text-white underline ml-3"
          >
            Retry Pipeline
          </button>
        </div>
      )}

      {/* ── Shimmer Skeleton Placeholder ──────────────────────────── */}
      {isRunning && results.length === 0 && <SkeletonResults count={3} />}

      {/* ── Recommendation Cards ──────────────────────────────────── */}
      {!isRunning && results.length > 0 && (
        <div className="results-grid">
          {(results as Array<{ entity?: { qloo_id?: string } }>).map((result, i) => (
            <ResultCard
              key={result?.entity?.qloo_id || i}
              result={result}
              rank={i}
              onFeedback={handleFeedback}
              feedbackGiven={feedbackMap[result?.entity?.qloo_id || ""]}
            />
          ))}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────── */}
      {!isRunning && !error && results.length === 0 && (
        <div className="glass-card p-12 text-center border-dashed border-white/15 my-6">
          <div className="text-5xl mb-4 animate-float">🎯</div>
          <h3 className="font-extrabold text-lg text-white mb-2">No Matching Experiences Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            The current constraints or taste profiles were too restrictive. Try expanding your budget, setting, or adding more likes.
          </p>
          <button
            onClick={() => dispatch({ type: "SET_STEP", step: 3 })}
            className="btn-primary text-xs px-6 py-2.5 rounded-xl shadow-lg"
          >
            Adjust Constraints →
          </button>
        </div>
      )}
    </div>
  );
}
