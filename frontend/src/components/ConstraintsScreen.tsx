/**
 * FamilyFusion AI — Constraints Screen (Step 3)
 *
 * Modern expansive bento-grid constraints controller configuring hard & soft filters
 * across setting, budget, energy, time, dietary, and accessibility.
 */

"use client";

import { useState } from "react";
import { useFamilyState } from "@/lib/store";
import type { ConstraintConfig, BudgetBand, EnergyLevel } from "@/lib/types";

const BUDGET_OPTIONS: { value: BudgetBand; label: string; desc: string; emoji: string }[] = [
  { value: "free", label: "Free ($0)", desc: "Zero cost outings & public events", emoji: "🆓" },
  { value: "low", label: "Budget ($)", desc: "Affordable & pocket-friendly", emoji: "💵" },
  { value: "medium", label: "Moderate ($$)", desc: "Standard casual & popular", emoji: "💰" },
  { value: "high", label: "Splurge ($$$)", desc: "Fine dining & premium tickets", emoji: "💎" },
  { value: "any", label: "Any Budget", desc: "No price restrictions", emoji: "🤷" },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; desc: string; emoji: string }[] = [
  { value: "low", label: "Low-key / Relaxed", desc: "Seated, low physical effort", emoji: "🛋️" },
  { value: "medium", label: "Moderate Walk", desc: "Light walking & casual stroll", emoji: "🚶" },
  { value: "high", label: "Active & Energetic", desc: "Brisk pace, immersive & dynamic", emoji: "🏃" },
  { value: "any", label: "Any Energy Level", desc: "Flexible for any intensity", emoji: "🤷" },
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

const CITY_SUGGESTIONS = [
  "San Francisco",
  "New York",
  "London",
  "Mumbai",
  "Tokyo",
  "Chicago",
  "Paris",
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
    setProcessingStep("🚀 Synthesizing multi-agent consensus and Qloo vectors...");

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
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-10 max-w-[1440px] mx-auto w-full relative z-10">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-semibold mb-3">
            <span>Step 3 • Boundaries, Context &amp; Filters</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2">
            ⚙️ Fine-Tune Constraints &amp; Context
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Tailor the recommendation envelope for location, budget tiers, physical accessibility, and energy levels.
          </p>
        </div>

        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-sm self-start md:self-auto">
          <span className="text-slate-400">Venue Setting:</span>
          <span className="font-bold text-cyan-300">
            {constraints.at_home ? "🛋️ Cozy at Home" : "🏙️ Going Out"}
          </span>
        </div>
      </div>

      {/* ── Bento Grid: Constraints Controls ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-10 items-stretch">
        {/* Tile 1: Setting & Location */}
        <div className="glass-card p-6 sm:p-7 border border-violet-500/25 shadow-xl rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>📍</span>
                <span>Setting &amp; Venue</span>
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300">
                {constraints.at_home ? "Stay In" : "Outing"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => updateConstraint("at_home", false)}
                className={`py-3.5 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                  !constraints.at_home
                    ? "bg-gradient-to-r from-violet-600/35 to-fuchsia-600/35 border-violet-400 text-white shadow-[0_0_16px_rgba(139,92,246,0.3)] scale-[1.02]"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-lg">🏙️</span>
                <span>Going Out</span>
              </button>
              <button
                type="button"
                onClick={() => updateConstraint("at_home", true)}
                className={`py-3.5 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                  constraints.at_home
                    ? "bg-gradient-to-r from-violet-600/35 to-fuchsia-600/35 border-violet-400 text-white shadow-[0_0_16px_rgba(139,92,246,0.3)] scale-[1.02]"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-lg">🛋️</span>
                <span>Cozy at Home</span>
              </button>
            </div>
          </div>

          {!constraints.at_home ? (
            <div>
              <label className="text-xs sm:text-sm text-slate-300 font-semibold block mb-2">
                Target City or Neighborhood:
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco, New York, Mumbai, Tokyo"
                value={constraints.location || ""}
                onChange={(e) => updateConstraint("location", e.target.value)}
                className="wizard-input text-sm mb-3"
              />
              <div className="flex flex-wrap gap-1.5">
                {CITY_SUGGESTIONS.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => updateConstraint("location", city)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 hover:text-violet-300 hover:border-violet-400/40 cursor-pointer"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
              Filtering for streaming services, home entertainment, or takeout delivery suitable for everyone at home.
            </p>
          )}
        </div>

        {/* Tile 2: Budget */}
        <div className="glass-card p-6 sm:p-7 border border-emerald-500/25 shadow-xl rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <span>💰</span>
                <span>Budget Target</span>
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold capitalize">
                {constraints.budget}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {BUDGET_OPTIONS.map((opt) => {
                const isSelected = constraints.budget === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateConstraint("budget", opt.value)}
                    className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border-emerald-400 text-white shadow-[0_0_14px_rgba(16,185,129,0.25)] font-bold scale-[1.01]"
                        : "bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{opt.emoji}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{opt.label}</div>
                        <div className="text-xs text-slate-400">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <span className="text-emerald-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tile 3: Energy Level */}
        <div className="glass-card p-6 sm:p-7 border border-purple-500/25 shadow-xl rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <span>⚡</span>
                <span>Energy &amp; Activity Intensity</span>
              </span>
              <span className="text-xs text-purple-300 font-mono font-bold capitalize">
                {constraints.energy_level}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {ENERGY_OPTIONS.map((opt) => {
                const isSelected = constraints.energy_level === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateConstraint("energy_level", opt.value)}
                    className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-purple-500/25 to-pink-500/20 border-purple-400 text-white shadow-[0_0_14px_rgba(168,85,247,0.25)] font-bold scale-[1.01]"
                        : "bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{opt.emoji}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{opt.label}</div>
                        <div className="text-xs text-slate-400">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <span className="text-purple-300 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tile 4: Duration / Time Available */}
        <div className="glass-card p-6 sm:p-7 border border-cyan-500/25 shadow-xl rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <span>⏱️</span>
                <span>Time Available</span>
              </span>
              <span className="text-xs text-cyan-300 font-mono font-bold">
                {constraints.time_available_minutes ? `${constraints.time_available_minutes} mins` : "Flexible"}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
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
                className="wizard-input flex-1 text-base py-3"
              />
              <span className="text-sm text-slate-300 font-medium whitespace-nowrap">
                minutes total
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2">
              {[60, 90, 120, 180].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => updateConstraint("time_available_minutes", mins)}
                  className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                    constraints.time_available_minutes === mins
                      ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                      : "bg-white/[0.04] hover:bg-white/10 text-slate-300 border-white/10"
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Leave blank or set flexible for full-length features and open dining.
          </p>
        </div>

        {/* Tile 5: Dietary Restrictions or Atmosphere */}
        <div className="glass-card p-6 sm:p-7 border border-amber-500/25 shadow-xl rounded-2xl flex flex-col justify-between md:col-span-1 lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <span>{showDietary ? "🥗" : "✨"}</span>
                <span>{showDietary ? "Dietary & Allergen Restrictions" : "Atmosphere & Social Dynamics"}</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {constraints.dietary_restrictions.length} active
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed">
              {showDietary
                ? "Select all restrictions for the cohort. Our engine guarantees matching venues cater safely to all selected diets:"
                : "Ensures the setting is conducive to multi-generational engagement with zero conflict or uncomfortable atmospheres."}
            </p>

            <div className="flex flex-wrap gap-2.5">
              {DIETARY_OPTIONS.map((opt) => {
                const isSelected = constraints.dietary_restrictions.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleDietary(opt)}
                    className={`chip text-xs sm:text-sm px-4 py-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-amber-500/25 to-orange-500/20 border-amber-400 text-amber-200 font-bold shadow-md"
                        : "bg-white/[0.04] border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    <span>{isSelected ? "✓" : "+"}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tile 6: Accessibility & Accommodations (Spanning Full Width) */}
        <div className="glass-card p-6 sm:p-7 border border-white/10 shadow-xl rounded-2xl md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span>♿</span>
              <span>Accessibility &amp; Special Accommodations</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">Optional Hard Filter</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mb-3 leading-relaxed">
            Specify physical mobility needs, sensory preferences, or stroller requirements to ensure every member navigates comfortably.
          </p>
          <input
            type="text"
            placeholder="e.g. Wheelchair accessible entrance required, stroller friendly, low noise seating, elevator access"
            value={constraints.mobility_notes || ""}
            onChange={(e) => updateConstraint("mobility_notes", e.target.value)}
            className="wizard-input text-base py-3.5"
          />
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────── */}
      {error && (
        <div className="glass-card p-4 mb-6 border border-rose-500/30 bg-rose-500/10 w-full text-center rounded-xl">
          <p className="text-rose-300 text-sm font-medium">⚠️ {error}</p>
        </div>
      )}

      {/* ── Processing Overlay ────────────────────────────────────── */}
      {isProcessing && (
        <div className="glass-card p-6 mb-6 text-center w-full border border-violet-500/30 rounded-2xl">
          <div className="animate-pulse-soft text-base font-semibold text-violet-300 mb-3">
            {processingStep}
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden max-w-xl mx-auto">
            <div className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 h-full rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* ── Footer Navigation ─────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between pt-6 border-t border-white/[0.1] mt-auto">
        <button
          onClick={prevStep}
          disabled={isProcessing}
          className="btn-secondary text-sm sm:text-base px-6 py-3 rounded-xl cursor-pointer"
        >
          ← Taste Preferences
        </button>

        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="btn-primary text-base sm:text-lg px-9 py-4 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.5)] flex items-center gap-3 cursor-pointer hover:scale-105 font-bold"
        >
          <span>✨ Discover AI Consensus Recommendations</span>
          <span className="text-xl">→</span>
        </button>
      </div>
    </div>
  );
}
