/**
 * FamilyFusion AI — Preferences Screen (Step 2)
 *
 * For each family member, enter likes and dislikes.
 * Shows entity resolution results as confirmable chips.
 * Person A owns this screen.
 */

"use client";

import { useState } from "react";
import { useFamilyState } from "@/lib/store";
import { GENERATION_META, CATEGORY_META } from "@/lib/types";
import type { FamilyMember, Preference, CategoryType } from "@/lib/types";

export default function PreferencesScreen() {
  const { state, dispatch, nextStep, prevStep } = useFamilyState();
  const [activeMember, setActiveMember] = useState(0);
  const [likeInput, setLikeInput] = useState("");
  const [dislikeInput, setDislikeInput] = useState("");

  const member = state.members[activeMember];
  if (!member) return null;

  const meta = GENERATION_META[member.generation];

  const addPreference = (text: string, isDislike: boolean) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const pref: Preference = {
      text: trimmed,
      category: state.category,
      is_dislike: isDislike,
    };

    const updated: FamilyMember = {
      ...member,
      liked_items: isDislike ? member.liked_items : [...member.liked_items, pref],
      disliked_items: isDislike ? [...member.disliked_items, pref] : member.disliked_items,
    };
    dispatch({ type: "UPDATE_MEMBER", member: updated });

    if (isDislike) setDislikeInput("");
    else setLikeInput("");
  };

  const removePreference = (index: number, isDislike: boolean) => {
    const updated: FamilyMember = {
      ...member,
      liked_items: isDislike
        ? member.liked_items
        : member.liked_items.filter((_, i) => i !== index),
      disliked_items: isDislike
        ? member.disliked_items.filter((_, i) => i !== index)
        : member.disliked_items,
    };
    dispatch({ type: "UPDATE_MEMBER", member: updated });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    isDislike: boolean,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPreference(isDislike ? dislikeInput : likeInput, isDislike);
    }
  };

  const allMembersHavePrefs = state.members.every(
    (m) => m.liked_items.length >= 1,
  );

  // Suggestions per category
  const suggestions: Record<CategoryType, { likes: string[]; dislikes: string[] }> = {
    movies: {
      likes: ["Spirited Away", "The Godfather", "Spider-Verse", "Bollywood classics", "Studio Ghibli", "Marvel"],
      dislikes: ["Horror movies", "Very long films", "Subtitled films"],
    },
    restaurants: {
      likes: ["Italian food", "Sushi", "BBQ", "Vegetarian", "Indian cuisine", "Thai food"],
      dislikes: ["Spicy food", "Fast food", "Seafood"],
    },
    activities: {
      likes: ["Hiking", "Board games", "Museums", "Cooking together", "Beach", "Escape rooms"],
      dislikes: ["Extreme sports", "Loud venues", "Long walks"],
    },
  };

  const currentSuggestions = suggestions[state.category];

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 relative z-10">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">
            ❤️ What does everyone like?
          </h2>
          <p className="text-[var(--ff-text-muted)] text-sm">
            Add likes and dislikes for each member. These guide the AI.
          </p>
        </div>

        {/* Member tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {state.members.map((m, idx) => {
            const mMeta = GENERATION_META[m.generation];
            const hasPrefs = m.liked_items.length > 0;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMember(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all border ${
                  idx === activeMember
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : hasPrefs
                      ? "border-green-500/30 bg-green-500/5 text-green-300"
                      : "border-[var(--ff-border)] bg-[var(--ff-surface)] text-[var(--ff-text-muted)]"
                }`}
              >
                <span>{mMeta.emoji}</span>
                <span>{m.nickname}</span>
                {hasPrefs && <span className="text-green-400 text-xs">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Active member preferences */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${meta.bgColor}`}
            >
              {meta.emoji}
            </div>
            <div>
              <h3 className="font-bold text-lg">{member.nickname}</h3>
              <p className={`text-xs ${meta.color}`}>{meta.label}</p>
            </div>
          </div>

          {/* Likes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-green-400 mb-2">
              👍 Likes — things they enjoy
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder={`e.g. "${currentSuggestions.likes[0]}"`}
                value={likeInput}
                onChange={(e) => setLikeInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, false)}
                className="flex-1 wizard-input"
              />
              <button
                onClick={() => addPreference(likeInput, false)}
                disabled={!likeInput.trim()}
                className="btn-primary"
              >
                + Add
              </button>
            </div>

            {/* Like chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {member.liked_items.map((pref, i) => (
                <span
                  key={i}
                  className="chip bg-green-500/10 border-green-500/20 text-green-300"
                >
                  {pref.text}
                  <button
                    onClick={() => removePreference(i, false)}
                    className="ml-1 text-green-400/60 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {member.liked_items.length === 0 && (
                <span className="text-xs text-[var(--ff-text-muted)] italic">
                  No likes added yet
                </span>
              )}
            </div>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-[var(--ff-text-muted)] mr-1">
                Suggestions:
              </span>
              {currentSuggestions.likes
                .filter(
                  (s) =>
                    !member.liked_items.some(
                      (l) => l.text.toLowerCase() === s.toLowerCase(),
                    ),
                )
                .slice(0, 4)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => addPreference(s, false)}
                    className="text-xs px-2.5 py-1 rounded-full bg-[var(--ff-surface)] border border-[var(--ff-border)] text-[var(--ff-text-muted)] hover:text-green-400 hover:border-green-500/30 transition-all"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>

          {/* Dislikes */}
          <div>
            <label className="block text-sm font-semibold text-red-400 mb-2">
              👎 Dislikes — things to avoid
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder={`e.g. "${currentSuggestions.dislikes[0]}"`}
                value={dislikeInput}
                onChange={(e) => setDislikeInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, true)}
                className="flex-1 wizard-input"
              />
              <button
                onClick={() => addPreference(dislikeInput, true)}
                disabled={!dislikeInput.trim()}
                className="btn-danger px-4 py-2 text-sm"
              >
                + Add
              </button>
            </div>

            {/* Dislike chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {member.disliked_items.map((pref, i) => (
                <span
                  key={i}
                  className="chip bg-red-500/10 border-red-500/20 text-red-300"
                >
                  {pref.text}
                  <button
                    onClick={() => removePreference(i, true)}
                    className="ml-1 text-red-400/60 hover:text-red-300 transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {member.disliked_items.length === 0 && (
                <span className="text-xs text-[var(--ff-text-muted)] italic">
                  No dislikes added (optional)
                </span>
              )}
            </div>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-[var(--ff-text-muted)] mr-1">
                Suggestions:
              </span>
              {currentSuggestions.dislikes
                .filter(
                  (s) =>
                    !member.disliked_items.some(
                      (d) => d.text.toLowerCase() === s.toLowerCase(),
                    ),
                )
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => addPreference(s, true)}
                    className="text-xs px-2.5 py-1 rounded-full bg-[var(--ff-surface)] border border-[var(--ff-border)] text-[var(--ff-text-muted)] hover:text-red-400 hover:border-red-500/30 transition-all"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Member summary badges */}
        <div className="glass-card p-4 mb-6">
          <p className="text-xs text-[var(--ff-text-muted)] mb-3 font-medium">
            📋 Preference Summary
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {state.members.map((m) => {
              const mMeta = GENERATION_META[m.generation];
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                    m.liked_items.length > 0
                      ? "bg-green-500/5 border border-green-500/20"
                      : "bg-[var(--ff-surface)] border border-[var(--ff-border)]"
                  }`}
                >
                  <span>{mMeta.emoji}</span>
                  <span className="font-medium truncate">{m.nickname}</span>
                  <span className="text-green-400 ml-auto">
                    {m.liked_items.length}↑
                  </span>
                  <span className="text-red-400">{m.disliked_items.length}↓</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-[var(--ff-border)]">
          <button onClick={prevStep} className="btn-secondary">
            ← Family
          </button>
          <div className="text-sm text-[var(--ff-text-muted)]">
            {allMembersHavePrefs ? (
              <span className="text-green-400">✓ All members have preferences</span>
            ) : (
              <span className="text-amber-400">
                {state.members.filter((m) => m.liked_items.length > 0).length} /{" "}
                {state.members.length} members done
              </span>
            )}
          </div>
          <button
            onClick={nextStep}
            disabled={!allMembersHavePrefs}
            className="btn-primary"
          >
            Set Constraints →
          </button>
        </div>
      </div>
    </div>
  );
}

