/**
 * FusionAI — Family Members Screen (Step 1)
 *
 * Clean two-column layout:
 * - Left: Member creation form with generation selector
 * - Right: Family roster with per-member cards
 */

"use client";

import { useState } from "react";
import { useFamilyState } from "@/lib/store";
import { GENERATION_META, CATEGORY_META } from "@/lib/types";
import type { GenerationLabel } from "@/lib/types";

const generationKeys = Object.keys(GENERATION_META) as GenerationLabel[];

const GENERATION_HINTS: Record<GenerationLabel, string> = {
  grandparent: "Mature classics, heritage & comfort",
  parent: "Balanced tastes, versatile & quality-driven",
  young_adult: "Modern trends, indie & collegiate vibes",
  teen: "Pop culture, viral trends & energetic",
  child: "Animation, family-friendly & accessible",
};

export default function MembersScreen() {
  const { state, addMember, removeMember, nextStep, prevStep } = useFamilyState();
  const [nickname, setNickname] = useState("");
  const [generation, setGeneration] = useState<GenerationLabel>("parent");

  const handleAdd = () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    if (state.members.length >= 6) return;
    addMember(trimmed, generation);
    setNickname("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const canProceed = state.members.length >= 2;

  const genCounts = state.members.reduce((acc, m) => {
    acc[m.generation] = (acc[m.generation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-[1440px] mx-auto w-full relative z-10">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="page-eyebrow inline-block">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-warm inline-block mr-1.5" />
              Step 1 • Family Members
            </span>
            <h2 className="page-title">
              Who is in the family?
            </h2>
            <p className="page-subtitle">
              Assemble 2 to 6 family members across any generation. Our cultural intelligence
              engine balances everyone&apos;s tastes with guaranteed fairness.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-base bg-white text-text-secondary text-sm font-medium">
            <span className="text-sm">🎬</span>
            <span>{CATEGORY_META[state.category]?.label}</span>
            <button
              onClick={prevStep}
              className="ml-2 text-[10px] font-bold uppercase text-text-muted hover:text-amber-warm underline hover:no-underline cursor-pointer"
            >
              change category
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ── Left Column: Add Member ── */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="card flex flex-col gap-4">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-warm flex items-center gap-1.5">
                  <span>➕</span>
                  <span>Add family member</span>
                </span>
                <span className="text-xs font-mono text-text-muted">
                  {state.members.length} / 6
                </span>
              </div>

              <div className="field">
                <label className="field-label">Name or nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Grandma Rose, Dad, Zoe"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="field-input"
                  maxLength={30}
                  autoFocus
                />
              </div>

              <div className="field">
                <label className="field-label">Generation bracket</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {generationKeys.map((gen) => {
                    const meta = GENERATION_META[gen];
                    const isSelected = generation === gen;
                    return (
                      <button
                        key={gen}
                        type="button"
                        onClick={() => setGeneration(gen)}
                        className={`flex flex-col items-start gap-2 p-3 rounded-lg border transition-all duration-200 text-left cursor-pointer ${
                          isSelected
                            ? "bg-amber-warm-light border-amber-warm/30"
                            : "border-border-base bg-white hover:bg-cream-100 hover:border-border-hover"
                        }`}
                      >
                        <span className="text-xl">{meta.emoji}</span>
                        <div>
                          <span className={`block text-sm font-bold ${isSelected ? "text-text-primary" : "text-text-secondary"}`}>
                            {meta.label}
                          </span>
                          <span className="block text-[11px] text-text-muted">
                            {GENERATION_HINTS[gen]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleAdd}
                disabled={!nickname.trim() || state.members.length >= 6}
                className="w-full btn btn--primary py-3 text-base font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>+ Add to family</span>
              </button>
            </div>
          </div>

          {/* Demographic balancing note */}
          <div className="card">
            <div className="card-body card-body--sm">
              <h4 className="font-display font-bold text-sm text-text-primary mb-2 flex items-center gap-2">
                <span>🧠</span>
                <span>Fairness engine</span>
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                Each generation contributes distinct cultural weights. When recommendations are
                scored, individual veto thresholds prevent any single family member from feeling
                excluded.
              </p>
              {Object.keys(genCounts).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border-base">
                  {Object.entries(genCounts).map(([gen, count]) => {
                    const meta = GENERATION_META[gen as GenerationLabel];
                    return (
                      <span
                        key={gen}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-warm-light border border-amber-warm/20 text-xs font-semibold text-amber-warm"
                      >
                        <span>{meta?.emoji}</span>
                        <span>{count} {meta?.label}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column: Family Roster ── */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1 mb-1">
            <div className="flex items-center gap-2.5">
              <h3 className="font-display font-bold text-base text-text-primary">
                Family roster
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-warm-light border border-amber-warm/20 text-amber-warm">
                {state.members.length} of 6
              </span>
            </div>

            {canProceed ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sage bg-sage-light px-3 py-1 rounded-full border border-sage/20">
                <span>✓</span>
                <span>Ready for preferences</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-warm bg-amber-warm-light px-3 py-1 rounded-full border border-amber-warm/20">
                <span>⚠</span>
                <span>Add at least {2 - state.members.length} more member{state.members.length === 1 ? "" : "s"}</span>
              </span>
            )}
          </div>

          {state.members.length === 0 ? (
            <div className="card flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="text-4xl mb-4">🫂</div>
              <h4 className="font-display font-bold text-lg text-text-primary mb-2">No family members yet</h4>
              <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed mb-6">
                Use the form on the left to add your family members. We need at least 2 members
                to calculate taste overlaps.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-text-muted bg-cream-100 px-4 py-2 rounded-full border border-border-base">
                <span>💡</span>
                <span>Or load a pre-built demo family from the welcome screen</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {state.members.map((member, index) => {
                const meta = GENERATION_META[member.generation];
                return (
                  <div
                    key={member.id}
                    className="card p-5 flex flex-col justify-between group hover:border-amber-warm/40 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-cream-100 border border-border-base flex items-center justify-center text-xl">
                            {meta.emoji}
                          </div>
                          <div>
                            <div className="font-display font-bold text-base text-text-primary flex items-center gap-2">
                              <span>{member.nickname}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-text-muted border border-border-base">
                                #{index + 1}
                              </span>
                            </div>
                            <span className="inline-block text-xs font-semibold text-amber-warm">
                              {meta.label}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => removeMember(member.id)}
                          className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-terracotta hover:bg-terracotta-light border border-transparent hover:border-terracotta/30 transition-all cursor-pointer"
                          title={`Remove ${member.nickname}`}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="text-xs text-text-muted font-medium bg-cream-50 px-3 py-2 rounded-md border border-border-base mb-3">
                        <span>❤️ {member.liked_items.length} likes</span>
                        <span className="mx-2">•</span>
                        <span>🚫 {member.disliked_items.length} dislikes</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border-base">
                      <span>{GENERATION_HINTS[member.generation]}</span>
                      <span className="text-sage font-semibold">Active</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Navigation ── */}
      <div className="w-full flex items-center justify-between pt-8 border-t border-border-base mt-auto">
        <button
          onClick={prevStep}
          className="btn btn--secondary text-sm px-6 py-3 rounded-lg cursor-pointer"
        >
          ← Welcome & demos
        </button>

        <button
          onClick={nextStep}
          disabled={!canProceed}
          className="btn btn--primary text-sm px-8 py-3.5 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 font-bold"
        >
          <span>Continue to preferences</span>
          <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
}
