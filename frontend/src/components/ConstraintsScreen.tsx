/**
 * FamilyFusion AI — Constraints Screen (Step 3)
 *
 * Configure hard/soft constraints before generating recommendations.
 * Person A owns this screen (Person B owns the constraint engine that filters).
 */

"use client";

import { useState } from "react";
import { useFamilyState } from "@/lib/store";
import { resolvePreferences, retrieveCandidates } from "@/lib/api";
import type { ConstraintConfig, BudgetBand, EnergyLevel } from "@/lib/types";

const BUDGET_OPTIONS: { value: BudgetBand; label: string; emoji: string }[] = [
  { value: "free", label: "Free", emoji: "🆓" },
  { value: "low", label: "Budget", emoji: "💵" },
  { value: "medium", label: "Moderate", emoji: "💰" },
  { value: "high", label: "Splurge", emoji: "💎" },
  { value: "any", label: "Any", emoji: "🤷" },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; emoji: string }[] = [
  { value: "low", label: "Low-key", emoji: "🛋️" },
  { value: "medium", label: "Moderate", emoji: "🚶" },
  { value: "high", label: "Active", emoji: "🏃" },
  { value: "any", label: "Any", emoji: "🤷" },
];

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten-free",
  "Nut-free",
  "Dairy-free",
  "Pescatarian",
];

export default function ConstraintsScreen() {
  const { state, dispatch, prevStep } = useFamilyState();
  const [constraints, setConstraints] = useState<ConstraintConfig>(state.constraints);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updateConstraint = <K extends keyof ConstraintConfig>(
    key: K,
    value: ConstraintConfig[K],
  ) => {
    setConstraints((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDietary = (item: string) => {
    setConstraints((prev) => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(item)
        ? prev.dietary_restrictions.filter((d) => d !== item)
        : [...prev.dietary_restrictions, item],
    }));
  };

  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);

    // Save constraints to state
    dispatch({ type: "SET_CONSTRAINTS", constraints });

    try {
      // Step 1: Resolve entities
      setProcessingStep("🔍 Resolving preferences with Qloo...");
      const resolved = await resolvePreferences({
        members: state.members.map((m) => ({
          id: m.id,
          nickname: m.nickname,
          generation: m.generation,
          liked_items: m.liked_items.map((p) => ({
            text: p.text,
            category: p.category,
            is_dislike: false,
          })),
          disliked_items: m.disliked_items.map((p) => ({
            text: p.text,
            category: p.category,
            is_dislike: true,
          })),
        })),
        category: state.category,
      });

      // Step 2: Retrieve candidates
      setProcessingStep("🧠 Finding recommendations for everyone...");
      const candidates = await retrieveCandidates({
        profile: resolved,
        category: state.category,
        location: constraints.location || undefined,
      });

      // Step 3: Move to results (Person B's territory)
      setProcessingStep("✨ Preparing results...");

      // Store the candidate pool for Person B's results screen
      // Using sessionStorage as a simple handoff mechanism
      sessionStorage.setItem(
        "familyfusion_candidate_pool",
        JSON.stringify(candidates),
      );
      sessionStorage.setItem(
        "familyfusion_resolved_profile",
        JSON.stringify(resolved),
      );
      sessionStorage.setItem(
        "familyfusion_constraints",
        JSON.stringify(constraints),
      );

      dispatch({ type: "SET_STEP", step: 4 });
    } catch (err) {
      console.error("Generation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate recommendations. Is the backend running?",
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const showDietary = state.category === "restaurants";

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 relative z-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">⚙️ Any constraints?</h2>
          <p className="text-[var(--ff-text-muted)] text-sm">
            Set optional limits. We'll filter results to match.
          </p>
        </div>

        {/* Setting / At Home toggle */}
        <div className="glass-card p-5 mb-4">
          <label className="text-sm font-semibold mb-3 block">
            📍 Setting
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => updateConstraint("at_home", false)}
              className={`chip flex-1 justify-center py-3 ${
                !constraints.at_home ? "chip-active" : ""
              }`}
            >
              🏙️ Going Out
            </button>
            <button
              onClick={() => updateConstraint("at_home", true)}
              className={`chip flex-1 justify-center py-3 ${
                constraints.at_home ? "chip-active" : ""
              }`}
            >
              🏠 At Home
            </button>
          </div>

          {!constraints.at_home && (
            <div className="mt-4">
              <input
                type="text"
                placeholder="City or area (e.g. San Francisco)"
                value={constraints.location || ""}
                onChange={(e) => updateConstraint("location", e.target.value)}
                className="w-full wizard-input"
              />
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="glass-card p-5 mb-4">
          <label className="text-sm font-semibold mb-3 block">
            💰 Budget
          </label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConstraint("budget", opt.value)}
                className={`chip ${
                  constraints.budget === opt.value ? "chip-active" : ""
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Energy */}
        <div className="glass-card p-5 mb-4">
          <label className="text-sm font-semibold mb-3 block">
            ⚡ Energy Level
          </label>
          <div className="flex flex-wrap gap-2">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConstraint("energy_level", opt.value)}
                className={`chip ${
                  constraints.energy_level === opt.value ? "chip-active" : ""
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="glass-card p-5 mb-4">
          <label className="text-sm font-semibold mb-3 block">
            ⏱️ Time Available (optional)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Minutes"
              min={15}
              max={480}
              value={constraints.time_available_minutes || ""}
              onChange={(e) =>
                updateConstraint(
                  "time_available_minutes",
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              className="w-32 wizard-input"
            />
            <span className="text-sm text-[var(--ff-text-muted)]">minutes</span>
          </div>
        </div>

        {/* Dietary (restaurants only) */}
        {showDietary && (
          <div className="glass-card p-5 mb-4">
            <label className="text-sm font-semibold mb-3 block">
              🥗 Dietary Restrictions
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleDietary(opt)}
                  className={`chip ${
                    constraints.dietary_restrictions.includes(opt)
                      ? "chip-active"
                      : ""
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobility */}
        <div className="glass-card p-5 mb-6">
          <label className="text-sm font-semibold mb-3 block">
            ♿ Mobility Notes (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Wheelchair accessible required"
            value={constraints.mobility_notes || ""}
            onChange={(e) => updateConstraint("mobility_notes", e.target.value)}
            className="w-full wizard-input"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card p-4 mb-4 border-red-500/30 bg-red-500/5">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="glass-card p-6 mb-6 text-center">
            <div className="animate-pulse-soft text-lg mb-2">
              {processingStep}
            </div>
            <div className="w-full bg-[var(--ff-border)] rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full animate-[pulse_1.5s_ease-in-out_infinite] w-2/3" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-[var(--ff-border)]">
          <button
            onClick={prevStep}
            disabled={isProcessing}
            className="btn-secondary"
          >
            ← Preferences
          </button>
          <button
            onClick={handleGenerate}
            disabled={isProcessing}
            className="btn-primary text-lg px-8 py-3"
          >
            {isProcessing ? "Generating..." : "✨ Find Experiences"}
          </button>
        </div>
      </div>
    </div>
  );
}

