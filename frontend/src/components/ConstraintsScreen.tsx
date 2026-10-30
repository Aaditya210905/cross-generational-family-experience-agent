/**
 * FusionAI — Constraints Screen (Step 3)
 *
 * Clean bento-grid constraint controller across setting, budget, energy, time, dietary, and accessibility.
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
  { value: "any", label: "Any budget", desc: "No price restrictions", emoji: "🤷" },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; desc: string; emoji: string }[] = [
  { value: "low", label: "Low-key / relaxed", desc: "Seated, low physical effort", emoji: "🛋️" },
  { value: "medium", label: "Moderate walk", desc: "Light walking & casual stroll", emoji: "🚶" },
  { value: "high", label: "Active & energetic", desc: "Brisk pace, immersive & dynamic", emoji: "🏃" },
  { value: "any", label: "Any energy", desc: "Flexible for any intensity", emoji: "🤷" },
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
    setProcessingStep("Synthesizing consensus and Qloo vectors…");

    dispatch({ type: "SET_CONSTRAINTS", constraints });

    setTimeout(() => {
      dispatch({ type: "SET_STEP", step: 4 });
      setIsProcessing(false);
    }, 400);
  };

  const showDietary = state.category === "restaurants";

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-[1440px] mx-auto w-full relative z-10">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="page-eyebrow inline-block">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-warm inline-block mr-1.5" />
              Step 3 • Boundaries & Context
            </span>
            <h2 className="page-title">
              Fine-tune constraints
            </h2>
            <p className="page-subtitle">
              Tailor the recommendation envelope for location, budget tiers, physical accessibility,
              and energy levels.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-base bg-white text-text-secondary text-sm font-medium">
            <span className="text-slate-400">Venue setting:</span>
            <span className="font-bold text-text-primary">
              {constraints.at_home ? "🛋️ Cozy at home" : "🏙️ Going out"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Constraint Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full mb-10 items-stretch">
        {/* Tile 1: Setting & Location */}
        <div className="card flex flex-col">
          <div className="card-body card-body--sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span>📍</span>
                <span>Setting & venue</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-warm-light text-amber-warm border border-amber-warm/20">
                {constraints.at_home ? "Stay in" : "Outing"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => updateConstraint("at_home", false)}
                className={`py-3 px-3 rounded-lg border text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  !constraints.at_home
                    ? "bg-amber-warm-light border-amber-warm/20 text-amber-warm"
                    : "border-border-base bg-white text-text-secondary hover:bg-cream-100"
                }`}
              >
                <span className="text-lg">🏙️</span>
                <span>Going out</span>
              </button>
              <button
                type="button"
                onClick={() => updateConstraint("at_home", true)}
                className={`py-3 px-3 rounded-lg border text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  constraints.at_home
                    ? "bg-amber-warm-light border-amber-warm/20 text-amber-warm"
                    : "border-border-base bg-white text-text-secondary hover:bg-cream-100"
                }`}
              >
                <span className="text-lg">🛋️</span>
                <span>Cozy at home</span>
              </button>
            </div>

            {!constraints.at_home ? (
              <div>
                <label className="field-label mb-2">Target city or neighborhood</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, New York, Mumbai, Tokyo"
                  value={constraints.location || ""}
                  onChange={(e) => updateConstraint("location", e.target.value)}
                  className="field-input mb-3"
                />
                <div className="flex flex-wrap gap-1.5">
                  {CITY_SUGGESTIONS.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => updateConstraint("location", city)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border-base bg-white text-text-muted hover:bg-cream-100 hover:text-text-primary hover:border-border-hover cursor-pointer"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary leading-relaxed bg-cream-50 p-3 rounded-md border border-border-base">
                Filtering for streaming services, home entertainment, or takeout delivery suitable for everyone at home.
              </p>
            )}
          </div>
        </div>

        {/* Tile 2: Budget */}
        <div className="card flex flex-col">
          <div className="card-body card-body--sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span>💰</span>
                <span>Budget target</span>
              </span>
              <span className="text-xs font-mono font-bold text-text-muted capitalize">
                {constraints.budget}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {BUDGET_OPTIONS.map((opt) => {
                const isSelected = constraints.budget === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateConstraint("budget", opt.value)}
                    className={`p-3 rounded-lg border transition-all duration-200 text-left cursor-pointer ${
                      isSelected
                        ? "bg-amber-warm-light border-amber-warm/20 text-amber-warm font-bold"
                        : "border-border-base bg-white text-text-secondary hover:bg-cream-100 hover:text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{opt.emoji}</span>
                      <div>
                        <div className="text-sm font-bold text-text-primary">{opt.label}</div>
                        <div className="text-[11px] text-text-muted">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <span className="text-xs font-bold text-amber-warm">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tile 3: Energy Level */}
        <div className="card flex flex-col">
          <div className="card-body card-body--sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span>⚡</span>
                <span>Energy & activity intensity</span>
              </span>
              <span className="text-xs font-mono font-bold text-text-muted capitalize">
                {constraints.energy_level}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {ENERGY_OPTIONS.map((opt) => {
                const isSelected = constraints.energy_level === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateConstraint("energy_level", opt.value)}
                    className={`p-3 rounded-lg border transition-all duration-200 text-left cursor-pointer ${
                      isSelected
                        ? "bg-amber-warm-light border-amber-warm/20 text-amber-warm font-bold"
                        : "border-border-base bg-white text-text-secondary hover:bg-cream-100 hover:text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{opt.emoji}</span>
                      <div>
                        <div className="text-sm font-bold text-text-primary">{opt.label}</div>
                        <div className="text-[11px] text-text-muted">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <span className="text-xs font-bold text-amber-warm">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tile 4: Duration / Time */}
        <div className="card flex flex-col">
          <div className="card-body card-body--sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span>⏱️</span>
                <span>Time available</span>
              </span>
              <span className="text-xs font-mono font-bold text-text-muted">
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
                className="field-input flex-1 py-3"
              />
              <span className="text-sm text-text-muted font-medium whitespace-nowrap">
                minutes total
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {[60, 90, 120, 180].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => updateConstraint("time_available_minutes", mins)}
                  className={`py-2 px-2 rounded-md text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                    constraints.time_available_minutes === mins
                      ? "bg-amber-warm-light border-amber-warm/20 text-amber-warm"
                      : "border-border-base bg-white text-text-secondary hover:bg-cream-100"
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Leave blank or flexible for full-length features and open dining.
            </p>
          </div>
        </div>

        {/* Tile 5: Dietary or Atmosphere */}
        <div className="card flex flex-col lg:col-span-2">
          <div className="card-body card-body--sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span>{showDietary ? "🥗" : "✨"}</span>
                <span>{showDietary ? "Dietary & allergen restrictions" : "Atmosphere & social dynamics"}</span>
              </span>
              <span className="text-xs font-mono text-text-muted">
                {constraints.dietary_restrictions.length} active
              </span>
            </div>

            <p className="text-sm text-text-secondary mb-4 leading-relaxed">
              {showDietary
                ? "Select all restrictions for the cohort. Our engine guarantees matching venues cater safely to all selected diets:"
                : "Ensures the setting is conducive to multi-generational engagement with zero conflict or uncomfortable atmospheres."}
            </p>

            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => {
                const isSelected = constraints.dietary_restrictions.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleDietary(opt)}
                    className={`chip text-xs px-3 py-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "chip--active"
                        : ""
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

        {/* Tile 6: Accessibility */}
        <div className="card flex flex-col lg:col-span-3">
          <div className="card-body card-body--sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span>♿</span>
                <span>Accessibility & accommodations</span>
              </span>
              <span className="text-xs font-medium text-text-muted">Optional filter</span>
            </div>
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              Specify physical mobility needs, sensory preferences, or stroller requirements to
              ensure every member navigates comfortably.
            </p>
            <input
              type="text"
              placeholder="e.g. Wheelchair accessible entrance, stroller friendly, low noise seating, elevator access"
              value={constraints.mobility_notes || ""}
              onChange={(e) => updateConstraint("mobility_notes", e.target.value)}
              className="field-input py-3"
            />
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="card p-4 mb-6 border-terracotta/30 bg-terracotta-light w-full text-center rounded-xl">
          <p className="text-terracotta text-sm font-medium">⚠ {error}</p>
        </div>
      )}

      {/* ── Processing Overlay ── */}
      {isProcessing && (
        <div className="card p-6 mb-6 text-center w-full border-amber-warm/30 rounded-xl">
          <div className="animate-pulse-soft text-base font-semibold text-amber-warm mb-3">
            {processingStep}
          </div>
          <div className="w-full bg-cream-200 rounded-full h-2 overflow-hidden max-w-xl mx-auto">
            <div className="bg-amber-warm h-full rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* ── Footer Navigation ── */}
      <div className="w-full flex items-center justify-between pt-8 border-t border-border-base mt-auto">
        <button
          onClick={prevStep}
          disabled={isProcessing}
          className="btn btn--secondary text-sm px-6 py-3 rounded-lg cursor-pointer disabled:opacity-50"
        >
          ← Taste preferences
        </button>

        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="btn btn--primary text-base px-9 py-4 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 font-bold"
        >
          <span>Discover AI consensus recommendations</span>
          <span className="text-xl">→</span>
        </button>
      </div>
    </div>
  );
}
