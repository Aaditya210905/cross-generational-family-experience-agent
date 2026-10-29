/**
 * FamilyFusion AI — Family Members Screen (Step 1)
 *
 * Add and manage family members with nickname and generation.
 * Person A owns this screen.
 */

"use client";

import { useState } from "react";
import { useFamilyState } from "@/lib/store";
import { GENERATION_META, CATEGORY_META } from "@/lib/types";
import type { GenerationLabel, CategoryType } from "@/lib/types";

const generationKeys = Object.keys(GENERATION_META) as GenerationLabel[];

export default function MembersScreen() {
  const { state, dispatch, addMember, removeMember, nextStep, prevStep } =
    useFamilyState();
  const [nickname, setNickname] = useState("");
  const [generation, setGeneration] = useState<GenerationLabel>("parent");

  const handleAdd = () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    if (state.members.length >= 6) return; // Hard cap for hackathon
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
    <div className="flex-1 flex flex-col items-center px-4 py-8 relative z-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">👨‍👩‍👧‍👦 Who's in the family?</h2>
          <p className="text-[var(--ff-text-muted)] text-sm">
            Add 2–6 family members. We'll ask each person's preferences next.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm">
            <span className="text-[var(--ff-text-muted)]">Looking for</span>
            <span className="chip chip-active text-xs">
              {CATEGORY_META[state.category].emoji}{" "}
              {CATEGORY_META[state.category].label}
            </span>
            <button
              onClick={prevStep}
              className="text-indigo-400 text-xs hover:underline"
            >
              change
            </button>
          </div>
        </div>

        {/* Add Member Form */}
        <div className="glass-card p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Nickname (e.g. Grandma Rose)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 wizard-input"
              maxLength={30}
            />
            <button
              onClick={handleAdd}
              disabled={!nickname.trim() || state.members.length >= 6}
              className="btn-primary whitespace-nowrap"
            >
              + Add
            </button>
          </div>

          {/* Generation selector */}
          <div className="flex flex-wrap gap-2">
            {generationKeys.map((gen) => {
              const meta = GENERATION_META[gen];
              return (
                <button
                  key={gen}
                  onClick={() => setGeneration(gen)}
                  className={`chip text-xs ${generation === gen ? "chip-active" : ""}`}
                >
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Member List */}
        {state.members.length === 0 ? (
          <div className="text-center py-12 text-[var(--ff-text-muted)]">
            <div className="text-4xl mb-3">🫂</div>
            <p className="text-sm">No members yet. Add your first family member above!</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {state.members.map((member, idx) => {
              const meta = GENERATION_META[member.generation];
              return (
                <div
                  key={member.id}
                  className="glass-card p-4 flex items-center justify-between group hover:transform-none"
                  style={{ transform: "none" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${meta.bgColor}`}
                    >
                      {meta.emoji}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{member.nickname}</div>
                      <div className={`text-xs ${meta.color}`}>{meta.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--ff-text-muted)]">
                      {member.liked_items.length} likes,{" "}
                      {member.disliked_items.length} dislikes
                    </span>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="btn-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-[var(--ff-border)]">
          <button onClick={prevStep} className="btn-secondary">
            ← Back
          </button>
          <div className="text-sm text-[var(--ff-text-muted)]">
            {state.members.length} / 6 members
            {!canProceed && (
              <span className="text-amber-400 ml-2">(need at least 2)</span>
            )}
          </div>
          <button
            onClick={nextStep}
            disabled={!canProceed}
            className="btn-primary"
          >
            Add Preferences →
          </button>
        </div>
      </div>
    </div>
  );
}

