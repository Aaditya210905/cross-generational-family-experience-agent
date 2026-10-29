/**
 * FusionAI — Results Screen (Step 4)
 *
 * Full results experience integrating Person B's pipeline:
 * 1. Agent trace panel (live SSE progress)
 * 2. Ranked results with per-person breakdown
 * 3. Feedback loop with "what changed" view
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
import { SkeletonResults, SkeletonTrace } from "./Skeletons";

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

  // Run the recommendation pipeline
  const runPipeline = useCallback(async (adjustment: unknown = null) => {
    setIsRunning(true);
    setError(null);
    setEvents([]);

    // Connect to SSE stream for progress
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = connectProgressStream(
      familyId,
      (data) => setEvents((prev) => [...prev, data as ProgressEvent]),
      () => setError("Connection lost. Results may still be processing."),
      () => {} // done handled by results
    );

    try {
      // Build the family profile from state
      const familyProfile = {
        family_id: familyId,
        category: state.category || "movies",
        members: state.members.map((m) => ({
          nickname: m.nickname,
          generation: m.generation,
          liked_items: m.liked_items.map((item: { text: string; category?: string }) => ({
            text: item.text,
            category: item.category || state.category || "movies",
          })),
          disliked_items: (m.disliked_items || []).map((item: { text: string; category?: string }) => ({
            text: item.text,
            category: item.category || state.category || "movies",
          })),
          avatar_emoji: m.avatar_emoji || "👤",
        })),
        constraints: state.constraints || {},
      };

      const data = await getRecommendations(familyProfile, adjustment) as { results?: unknown[] };
      setResults(data?.results || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Pipeline failed";
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
        [{ entity_id: entityId, entity_name: entityName, reaction }],
        results as unknown[],
      );

      // Re-run with adjustment
      setRound((r) => r + 1);
      await runPipeline(adjustment);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Feedback failed";
      setError(message);
    }
  }, [familyId, results, runPipeline]);

  const handleStartOver = async () => {
    try {
      await clearFeedback(familyId);
    } catch {
      // ignore
    }
    sessionStorage.removeItem("familyfusion_candidate_pool");
    sessionStorage.removeItem("familyfusion_resolved_profile");
    sessionStorage.removeItem("familyfusion_constraints");
    dispatch({ type: "RESET" });
  };

  return (
    <div className="flex-1 flex flex-col px-4 py-8 relative z-10">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {isRunning ? "Finding Recommendations..." : `Recommendations (Round ${round})`}
            </h2>
            <p className="text-sm text-[var(--ff-text-muted)] mt-1">
              {state.members.length} family members •{" "}
              {state.category || "movies"}
            </p>
          </div>
          <button onClick={handleStartOver} className="btn-secondary text-sm">
            ← Start Over
          </button>
        </div>

        {/* Agent Trace */}
        {(isRunning || events.length > 0) && (
          <AgentTrace events={events} isRunning={isRunning} />
        )}

        {/* Error */}
        {error && (
          <div className="glass-card p-4 mb-6 border-l-4 border-red-400">
            <p className="text-red-300 text-sm">⚠️ {error}</p>
            <button
              onClick={() => runPipeline()}
              className="btn-secondary text-xs mt-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isRunning && results.length === 0 && <SkeletonResults count={4} />}

        {/* Results */}
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

        {/* No results */}
        {!isRunning && !error && results.length === 0 && events.length > 0 && (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-4">🤷</div>
            <h3 className="font-bold mb-2">No recommendations found</h3>
            <p className="text-sm text-[var(--ff-text-muted)]">
              Try adjusting your preferences or constraints.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
