/**
 * FamilyFusion AI — Family Members Screen (Step 1)
 *
 * Futuristic interface to assemble the multi-generational family cohort.
 */

"use client";

import { useState } from "react";
import { useFamilyState } from "@/lib/store";
import { GENERATION_META, CATEGORY_META } from "@/lib/types";
import type { GenerationLabel } from "@/lib/types";

const generationKeys = Object.keys(GENERATION_META) as GenerationLabel[];

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

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 pb-20 relative z-10 max-w-3xl mx-auto w-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          <span>Step 1 • Demographics</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          👨‍👩‍👧‍👦 Who is in the Family?
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Add 2 to 6 family members across any generation. Our algorithm balances everyone's tastes fairly.
        </p>

        {/* Category Pill Indicator */}
        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs">
          <span className="text-slate-400">Current Category:</span>
          <span className="font-bold text-indigo-300 flex items-center gap-1">
            <span>{CATEGORY_META[state.category]?.emoji}</span>
            <span>{CATEGORY_META[state.category]?.label}</span>
          </span>
          <button
            onClick={prevStep}
            className="text-xs text-indigo-400 hover:text-indigo-300 ml-1 underline cursor-pointer"
          >
            change
          </button>
        </div>
      </div>

      {/* ── Member Creator Card ───────────────────────────────────── */}
      <div className="glass-card p-6 mb-8 w-full border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
        <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">
          Add New Member
        </div>

        {/* Input & Add Button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter name or nickname (e.g. Grandma Rose, Dad, Zoe)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={handleKeyDown}
              className="wizard-input pr-12"
              maxLength={30}
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono hidden sm:block">
              ↵ Enter
            </span>
          </div>
          <button
            onClick={handleAdd}
            disabled={!nickname.trim() || state.members.length >= 6}
            className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap shadow-md hover:scale-105"
          >
            + Add Member
          </button>
        </div>

        {/* Generation Tag Selection */}
        <div>
          <span className="text-xs text-slate-400 font-medium block mb-2">
            Select Generation Bracket:
          </span>
          <div className="flex flex-wrap gap-2">
            {generationKeys.map((gen) => {
              const meta = GENERATION_META[gen];
              const isSelected = generation === gen;
              return (
                <button
                  key={gen}
                  onClick={() => setGeneration(gen)}
                  className={`chip text-xs px-3.5 py-1.5 transition-all ${
                    isSelected ? "chip-active font-bold" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  <span className="text-base">{meta.emoji}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Active Members Roster ──────────────────────────────────── */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Family Cohort ({state.members.length}/6)
          </span>
          {!canProceed && (
            <span className="text-xs text-amber-400 font-medium">
              ⚠️ Add at least {2 - state.members.length} more member{state.members.length === 1 ? "" : "s"} to proceed
            </span>
          )}
        </div>

        {state.members.length === 0 ? (
          <div className="glass-card p-10 text-center border-dashed border-white/10">
            <div className="text-4xl mb-3 animate-float">🫂</div>
            <h4 className="font-bold text-base text-white mb-1">No Members Added Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Type a name above and select their generation to start building your cross-generational cohort.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.members.map((member, index) => {
              const meta = GENERATION_META[member.generation];
              return (
                <div
                  key={member.id}
                  className="glass-card p-4 flex items-center justify-between border border-white/[0.08] hover:border-indigo-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Avatar circle */}
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-white/[0.08] to-white/[0.03] border border-white/15 flex items-center justify-center text-2xl shadow-inner">
                      {meta.emoji}
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{member.nickname}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 font-mono">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="text-xs text-indigo-400 font-medium">
                        {meta.label}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400 font-medium hidden sm:block">
                      {member.liked_items.length} likes • {member.disliked_items.length} dislikes
                    </span>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-all opacity-80 group-hover:opacity-100"
                      title="Remove member"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer Navigation Bar ─────────────────────────────────── */}
      <div className="w-full flex items-center justify-between pt-5 border-t border-white/[0.08]">
        <button onClick={prevStep} className="btn-secondary text-sm px-5 py-2.5">
          ← Overview
        </button>

        <button
          onClick={nextStep}
          disabled={!canProceed}
          className="btn-primary text-sm px-7 py-3 rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-40"
        >
          <span>Continue to Preferences</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
