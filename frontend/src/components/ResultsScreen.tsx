/**
 * FamilyFusion AI — Results Placeholder Screen (Step 4)
 *
 * This is a placeholder for Person B's results screen.
 * Person B will replace this with the full ranking, constraint filtering,
 * explanation, and feedback UI. Person A provides the candidate pool
 * via sessionStorage.
 */

"use client";

import { useEffect, useState } from "react";
import { useFamilyState } from "@/lib/store";

export default function ResultsScreen() {
  const { state, dispatch } = useFamilyState();
  const [poolSize, setPoolSize] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("familyfusion_candidate_pool");
    if (raw) {
      try {
        const pool = JSON.parse(raw);
        setPoolSize(pool.candidates?.length ?? 0);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleStartOver = () => {
    sessionStorage.removeItem("familyfusion_candidate_pool");
    sessionStorage.removeItem("familyfusion_resolved_profile");
    sessionStorage.removeItem("familyfusion_constraints");
    dispatch({ type: "RESET" });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-2xl text-center">
        <div className="text-6xl mb-6">✨</div>
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
          Candidate Pool Ready!
        </h2>
        <p className="text-[var(--ff-text-muted)] text-lg mb-2">
          Person A's work is done.
        </p>

        <div className="glass-card p-6 mb-8 inline-block">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-indigo-400">
                {state.members.length}
              </div>
              <div className="text-xs text-[var(--ff-text-muted)]">Members</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">
                {poolSize}
              </div>
              <div className="text-xs text-[var(--ff-text-muted)]">
                Candidates
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-400">
                {state.members.reduce(
                  (sum, m) => sum + m.liked_items.length + m.disliked_items.length,
                  0,
                )}
              </div>
              <div className="text-xs text-[var(--ff-text-muted)]">
                Preferences
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 mb-8 text-left max-w-md mx-auto">
          <h3 className="font-semibold text-sm mb-3 text-center">
            🔗 Handoff to Person B
          </h3>
          <p className="text-xs text-[var(--ff-text-muted)] mb-3">
            The candidate pool with per-person scores is stored and ready. Person
            B's code will:
          </p>
          <ul className="text-xs text-[var(--ff-text-muted)] space-y-1.5">
            <li>✅ Apply fairness-aware group ranking</li>
            <li>✅ Filter by constraints</li>
            <li>✅ Generate grounded explanations</li>
            <li>✅ Show results with per-person "why" cards</li>
            <li>✅ Collect feedback for re-ranking</li>
          </ul>
        </div>

        <button onClick={handleStartOver} className="btn-secondary">
          ← Start Over
        </button>
      </div>
    </div>
  );
}

