/**
 * FamilyFusion AI — Constraints Screen (Step 3)
 *
 * Bento-grid constraints controller configuring hard & soft filters.
 */

"use client";

import { useState } from "react";
import { useFamilyState } from "@/lib/store";
import type { ConstraintConfig, BudgetBand, EnergyLevel } from "@/lib/types";

const BUDGET_OPTIONS: { value: BudgetBand; label: string; emoji: string }[] = [
  { value: "free", label: "Free", emoji: "🆓" },
  { value: "low", label: "Budget ($)", emoji: "💵" },
  { value: "medium", label: "Moderate ($$)", emoji: "💰" },
  { value: "high", label: "Splurge ($$$)", emoji: "💎" },
  { value: "any", label: "Any Budget", emoji: "🤷" },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; emoji: string }[] = [
  { value: "low", label: "Low-key / Relaxed", emoji: "🛋️" },
  { value: "medium", label: "Moderate Walk", emoji: "🚶" },
  { value: "high", label: "Active & Energetic", emoji: "🏃" },
  { value: "any", label: "Any Level", emoji: "🤷" },
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
    setProcessingStep("🚀 Initializing Qloo recommendation pipeline...");

    // Save constraints to state
    dispatch({ type: "SET_CONSTRAINTS", constraints });

    // Transition straight to Results (which streams live progress and runs pipeline)
    setTimeout(() => {
      dispatch({ type: "SET_STEP", step: 4 });
      setIsProcessing(false);
    }, 400);
  };

  const showDietary = state.category === "restaurants";

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 pb-20 relative z-10 max-w-4xl mx-auto w-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-3">
          <span>Step 3 • Boundaries &amp; Filters</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          ⚙️ Fine-Tune Constraints &amp; Context
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Tailor the recommendation envelope for location, budget, physical accessibility, and energy.
        </p>
      </div>

      {/* ── Bento Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-8">
        {/* Tile 1: Setting & Location */}
        <div className="glass-card p-6 border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>📍 Setting &amp; Venue</span>
              </span>
              <span className="text-xs text-indigo-400 font-medium">
                {constraints.at_home ? "Home Comfort" : "Going Out"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <button
                onClick={() => updateConstraint("at_home", false)}
                className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !constraints.at_home
                    ? "bg-indigo-600/30 border-indigo-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.3)]"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <span>🏙️ Going Out</span>
              </button>
              <button
                onClick={() => updateConstraint("at_home", true)}
                className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  constraints.at_home
                    ? "bg-indigo-600/30 border-indigo-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.3)]"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <span>🛋️ Cozy at Home</span>
              </button>
            </div>
          </div>

          {!constraints.at_home && (
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">
                Target City or Neighborhood:
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco, New York, Mumbai, Tokyo"
                value={constraints.location || ""}
                onChange={(e) => updateConstraint("location", e.target.value)}
                className="wizard-input text-xs"
              />
            </div>
          )}
        </div>

        {/* Tile 2: Budget */}
        <div className="glass-card p-6 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              💰 Budget Target
            </span>
            <span className="text-xs text-indigo-400 font-mono capitalize">
              {constraints.budget}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConstraint("budget", opt.value)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  constraints.budget === opt.value
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.25)] font-bold"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span>{opt.emoji}</span>
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tile 3: Energy Level */}
        <div className="glass-card p-6 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ⚡ Energy &amp; Activity Intensity
            </span>
            <span className="text-xs text-indigo-400 font-mono capitalize">
              {constraints.energy_level}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConstraint("energy_level", opt.value)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  constraints.energy_level === opt.value
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_14px_rgba(168,85,247,0.25)] font-bold"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span>{opt.emoji}</span>
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tile 4: Duration / Time Available */}
        <div className="glass-card p-6 border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ⏱️ Time Available
            </span>
            <span className="text-xs text-indigo-400 font-mono">
              {constraints.time_available_minutes ? `${constraints.time_available_minutes} mins` : "Flexible"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="e.g. 120"
              min={15}
              max={480}
              value={constraints.time_available_minutes || ""}
              onChange={(e) =>
                updateConstraint(
                  "time_available_minutes",
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              className="wizard-input flex-1 text-xs"
            />
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              minutes total
            </span>
          </div>

          <div className="flex gap-1.5 mt-3">
            {[60, 90, 120, 180].map((mins) => (
              <button
                key={mins}
                onClick={() => updateConstraint("time_available_minutes", mins)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Tile 5: Dietary Restrictions (conditional) */}
        {showDietary && (
          <div className="glass-card p-6 border border-white/[0.08] md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                🥗 Dietary Restrictions
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {constraints.dietary_restrictions.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => {
                const isSelected = constraints.dietary_restrictions.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleDietary(opt)}
                    className={`chip text-xs px-3.5 py-1.5 transition-all cursor-pointer ${
                      isSelected ? "chip-active font-bold" : "opacity-75 hover:opacity-100"
                    }`}
                  >
                    <span>{isSelected ? "✓" : "+"}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tile 6: Mobility & Notes */}
        <div className={`glass-card p-6 border border-white/[0.08] ${showDietary ? "md:col-span-2" : "md:col-span-2"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ♿ Accessibility &amp; Special Accommodations
            </span>
            <span className="text-[11px] text-slate-500">Optional</span>
          </div>
          <input
            type="text"
            placeholder="e.g. Wheelchair accessible entrance required, stroller friendly, low noise seating"
            value={constraints.mobility_notes || ""}
            onChange={(e) => updateConstraint("mobility_notes", e.target.value)}
            className="wizard-input text-xs"
          />
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────── */}
      {error && (
        <div className="glass-card p-4 mb-6 border border-rose-500/30 bg-rose-500/10 w-full text-center">
          <p className="text-rose-300 text-xs font-medium">⚠️ {error}</p>
        </div>
      )}

      {/* ── Processing Overlay ────────────────────────────────────── */}
      {isProcessing && (
        <div className="glass-card p-6 mb-6 text-center w-full border border-indigo-500/30">
          <div className="animate-pulse-soft text-sm font-semibold text-indigo-300 mb-2">
            {processingStep}
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* ── Footer Navigation ─────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between pt-5 border-t border-white/[0.08]">
        <button onClick={prevStep} disabled={isProcessing} className="btn-secondary text-sm px-5 py-2.5">
          ← Preferences
        </button>

        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="btn-primary text-base px-9 py-3.5 rounded-xl shadow-[0_0_25px_rgba(99,102,241,0.6)] flex items-center gap-2.5 hover:scale-105"
        >
          <span>✨ Discover AI Recommendations</span>
          <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
}
