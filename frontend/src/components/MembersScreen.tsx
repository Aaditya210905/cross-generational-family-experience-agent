/**
 * FamilyFusion AI — Family Members Screen (Step 1)
 *
 * Modern expansive 2-column dashboard layout:
 * - Left: Member Creator & Generation Selector with demographic insight
 * - Right: Active Family Cohort Grid with live balance stats
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

  // Generational tally for cohort breakdown
  const genCounts = state.members.reduce((acc, m) => {
    acc[m.generation] = (acc[m.generation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-10 max-w-[1440px] mx-auto w-full relative z-10">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs sm:text-sm font-semibold mb-3">
            <span>Step 1 • Demographics &amp; Cohort Setup</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2">
            👨‍👩‍👧‍👦 Who is in the Family?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Assemble 2 to 6 family members across any generation. Our cultural intelligence engine balances everyone&apos;s tastes with guaranteed fairness.
          </p>
        </div>

        {/* Activity Category Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-sm self-start md:self-auto">
          <span className="text-slate-400">Current Category:</span>
          <span className="font-bold text-violet-300 flex items-center gap-1.5">
            <span className="text-base">{CATEGORY_META[state.category]?.emoji}</span>
            <span>{CATEGORY_META[state.category]?.label}</span>
          </span>
          <button
            onClick={prevStep}
            className="text-xs text-violet-400 hover:text-violet-300 ml-1 underline cursor-pointer font-medium"
          >
            change
          </button>
        </div>
      </div>

      {/* ── Main 2-Column Dashboard Grid ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full mb-10 items-start">
        {/* ── Left Column: Add Member Form (5 Cols) ────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card p-6 sm:p-7 border border-violet-500/25 shadow-2xl rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-violet-300 flex items-center gap-2">
                <span>➕</span>
                <span>Add Family Member</span>
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">
                {state.members.length}/6 slots filled
              </span>
            </div>

            {/* Input & Key Hint */}
            <div className="relative mb-5">
              <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-2">
                Name or Nickname
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Grandma Rose, Dad, Zoe, Arjun"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="wizard-input pr-16 text-base"
                  maxLength={30}
                  autoFocus
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono hidden sm:inline-block bg-white/[0.06] px-2 py-0.5 rounded border border-white/10">
                  ↵ Enter
                </span>
              </div>
            </div>

            {/* Generation Selector */}
            <div className="mb-6">
              <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-2.5">
                Select Generation Bracket
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {generationKeys.map((gen) => {
                  const meta = GENERATION_META[gen];
                  const isSelected = generation === gen;
                  return (
                    <button
                      key={gen}
                      type="button"
                      onClick={() => setGeneration(gen)}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all border text-left cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                          : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 text-slate-300"
                      }`}
                    >
                      <span className="text-2xl mt-0.5">{meta.emoji}</span>
                      <div className="min-w-0">
                        <span className={`block text-xs sm:text-sm font-bold ${isSelected ? "text-white" : "text-slate-200"}`}>
                          {meta.label}
                        </span>
                        <span className="block text-[11px] text-slate-400 truncate">
                          {GENERATION_HINTS[gen]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleAdd}
              disabled={!nickname.trim() || state.members.length >= 6}
              className="w-full btn-primary py-3.5 text-base font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <span>+ Add to Family Cohort</span>
            </button>
          </div>

          {/* Demographic Intelligence Pill Box */}
          <div className="glass-card p-5 border border-white/[0.08] rounded-2xl bg-white/[0.02]">
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <span>🧠</span>
              <span>Fairness Engine Demographic Balancing</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Each generation contributes distinct cultural weights. When recommendations are scored, individual veto thresholds prevent any single family member from feeling excluded.
            </p>
            {Object.keys(genCounts).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                {Object.entries(genCounts).map(([gen, count]) => {
                  const meta = GENERATION_META[gen as GenerationLabel];
                  return (
                    <span
                      key={gen}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-300"
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

        {/* ── Right Column: Active Family Cohort Roster (7 Cols) ────── */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1 mb-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Active Family Cohort
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/30">
                {state.members.length} of 6
              </span>
            </div>

            {canProceed ? (
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                <span>✓</span>
                <span>Ready for Preferences</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                <span>⚠️</span>
                <span>Add at least {2 - state.members.length} more member{state.members.length === 1 ? "" : "s"}</span>
              </span>
            )}
          </div>

          {state.members.length === 0 ? (
            <div className="glass-card p-12 text-center border-dashed border-white/15 rounded-2xl">
              <div className="text-5xl mb-4 animate-float">🫂</div>
              <h4 className="font-extrabold text-lg sm:text-xl text-white mb-2">No Family Members Added Yet</h4>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
                Use the form on the left to add your family members (e.g., grandparents, parents, teens, kids). We need at least 2 members to calculate taste overlaps.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-white/[0.04] px-4 py-2 rounded-xl border border-white/10">
                <span>💡</span>
                <span>Or return to the Overview tab to load pre-built demo families</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {state.members.map((member, index) => {
                const meta = GENERATION_META[member.generation];
                return (
                  <div
                    key={member.id}
                    className="glass-card p-5 border border-white/[0.08] hover:border-violet-500/40 transition-all rounded-2xl flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      {/* Top Row: Avatar + Actions */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-500/20 to-fuchsia-500/20 border border-white/15 flex items-center justify-center text-2xl shadow-inner">
                            {meta.emoji}
                          </div>
                          <div>
                            <div className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                              <span>{member.nickname}</span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                                #{index + 1}
                              </span>
                            </div>
                            <span className="inline-block text-xs font-semibold text-violet-300">
                              {meta.label}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => removeMember(member.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500/20 border border-transparent hover:border-rose-500/40 transition-all cursor-pointer"
                          title={`Remove ${member.nickname}`}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Taste Signals Count */}
                      <div className="text-xs text-slate-400 font-medium bg-white/[0.03] px-3 py-2 rounded-xl border border-white/[0.06] mb-3">
                        <span>❤️ {member.liked_items.length} Likes</span>
                        <span className="mx-2">•</span>
                        <span>🚫 {member.disliked_items.length} Dislikes</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/[0.06]">
                      <span>{GENERATION_HINTS[member.generation]}</span>
                      <span className="text-emerald-400 font-semibold">Active</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Navigation Bar ─────────────────────────────────── */}
      <div className="w-full flex items-center justify-between pt-6 border-t border-white/[0.1] mt-auto">
        <button
          onClick={prevStep}
          className="btn-secondary text-sm sm:text-base px-6 py-3 rounded-xl cursor-pointer"
        >
          ← Overview &amp; Demos
        </button>

        <button
          onClick={nextStep}
          disabled={!canProceed}
          className="btn-primary text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-xl flex items-center gap-3 cursor-pointer disabled:opacity-40 font-bold"
        >
          <span>Continue to Preferences</span>
          <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
}
