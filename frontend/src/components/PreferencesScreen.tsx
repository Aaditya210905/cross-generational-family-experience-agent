/**
 * FamilyFusion AI — Preferences Screen (Step 2)
 *
 * Modern expansive 2-column dashboard layout:
 * - Left: Member Navigator with completion checkmarks & Cohort Readiness Summary
 * - Right: Active Member Taste Intake (Likes & Dealbreakers) with generous inputs and suggestions
 */

"use client";

import { useState } from "react";
import { useFamilyState } from "@/lib/store";
import { GENERATION_META } from "@/lib/types";
import type { FamilyMember, Preference, CategoryType } from "@/lib/types";

export default function PreferencesScreen() {
  const { state, dispatch, nextStep, prevStep } = useFamilyState();
  const [activeMember, setActiveMember] = useState(0);
  const [likeInput, setLikeInput] = useState("");
  const [dislikeInput, setDislikeInput] = useState("");

  const member = state.members[activeMember] || state.members[0];
  if (!member) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center max-w-[1440px] mx-auto w-full">
        <p className="text-base text-slate-300 mb-6">Please add family members first.</p>
        <button onClick={prevStep} className="btn-primary text-sm px-6 py-3 rounded-xl cursor-pointer">
          ← Back to Family Cohort
        </button>
      </div>
    );
  }

  const meta = GENERATION_META[member.generation] || {
    label: "Family Member",
    emoji: "👤",
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
  };

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

  const handleKeyDown = (e: React.KeyboardEvent, isDislike: boolean) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPreference(isDislike ? dislikeInput : likeInput, isDislike);
    }
  };

  const allMembersHavePrefs = state.members.length >= 2 && state.members.every(
    (m) => m.liked_items.length >= 1,
  );

  // Suggestions per category
  const suggestions: Record<CategoryType, { likes: string[]; dislikes: string[] }> = {
    movies: {
      likes: ["Spirited Away", "The Godfather", "Spider-Verse", "Bollywood classics", "Studio Ghibli", "Marvel Cinematic", "Inception", "Coco", "Back to the Future", "Jurassic Park"],
      dislikes: ["Horror & gore", "Excessive violence", "Very long 3hr+ films", "Black & white", "Jump scares"],
    },
    restaurants: {
      likes: ["Italian handmade pasta", "Fresh Sushi & Sashimi", "Smoked Texas BBQ", "Authentic Indian Curry", "Thai Street Food", "Mexican Street Tacos", "Mediterranean Tapas", "Wood-fired Pizza"],
      dislikes: ["Extreme spicy peppers", "Greasy fast food", "Raw seafood", "Noisy club dining", "Overcooked steak"],
    },
    activities: {
      likes: ["Scenic nature hiking", "Board game cafe", "Art & science museum", "Escape room challenge", "Sunset beach walk", "Miniature golf", "Botanical garden tour", "Live acoustic music"],
      dislikes: ["Extreme heights", "Loud concerts", "Strenuous climbing", "Stuffy enclosed spaces", "Long queues"],
    },
  };

  const currentSuggestions = suggestions[state.category] || suggestions.movies;

  const totalLikes = state.members.reduce((acc, m) => acc + m.liked_items.length, 0);
  const totalDislikes = state.members.reduce((acc, m) => acc + m.disliked_items.length, 0);

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-10 max-w-[1440px] mx-auto w-full relative z-10">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 text-xs sm:text-sm font-semibold mb-3">
            <span>Step 2 • Taste Signals &amp; Cultural DNA</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2">
            ❤️ What Does Everyone Enjoy?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Specify favorites and dealbreakers for each family member. Qloo projects these inputs into multi-dimensional cultural vectors to identify genuine consensus.
          </p>
        </div>

        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-sm self-start md:self-auto">
          <span className="text-slate-400">Total Signals Logged:</span>
          <span className="font-bold text-emerald-300">{totalLikes} Likes</span>
          <span className="text-slate-600">•</span>
          <span className="font-bold text-rose-300">{totalDislikes} Dislikes</span>
        </div>
      </div>

      {/* ── 2-Column Expansive Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full mb-10 items-start">
        {/* ── Left Column: Member Navigator & Cohort Status (4 Cols) ─── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-5 sm:p-6 border border-violet-500/25 shadow-2xl rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-violet-300 flex items-center gap-2">
                <span>👥</span>
                <span>Select Member</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {state.members.filter((m) => m.liked_items.length > 0).length}/{state.members.length} ready
              </span>
            </div>

            {/* Member Tabs List */}
            <div className="flex flex-col gap-3">
              {state.members.map((m, idx) => {
                const mMeta = GENERATION_META[m.generation] || { emoji: "👤", label: "Member" };
                const hasLikes = m.liked_items.length > 0;
                const isSelected = idx === activeMember;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveMember(idx)}
                    className={`flex items-center justify-between p-3.5 rounded-xl transition-all border text-left cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-violet-600/35 to-fuchsia-600/25 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.25)] scale-[1.01]"
                        : hasLikes
                          ? "bg-emerald-500/[0.05] border-emerald-500/30 hover:bg-emerald-500/[0.08]"
                          : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                        {mMeta.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm sm:text-base text-white truncate">
                          {m.nickname}
                        </div>
                        <div className="text-xs text-slate-400">
                          {mMeta.label}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {hasLikes ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                          <span>✓</span>
                          <span>{m.liked_items.length} likes</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold animate-pulse">
                          <span>Needs like</span>
                        </span>
                      )}
                      {m.disliked_items.length > 0 && (
                        <span className="text-[11px] text-rose-300/80 font-medium">
                          {m.disliked_items.length} dislikes
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Taste Intelligence Guidance Card */}
          <div className="glass-card p-5 border border-white/[0.08] rounded-2xl bg-white/[0.02]">
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <span>💡</span>
              <span>Pro Tip for Better Matches</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Adding 2-3 specific titles or cuisines per person yields 4x higher recommendation precision than broad generic genres.
            </p>
          </div>
        </div>

        {/* ── Right Column: Active Member Taste Profile (8 Cols) ─────── */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Member Banner Card */}
          <div className="glass-card p-6 sm:p-7 border border-violet-500/30 shadow-2xl rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-500/25 to-fuchsia-500/25 border border-white/20 flex items-center justify-center text-4xl shadow-inner">
                  {meta.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="font-extrabold text-2xl text-white">{member.nickname}</h3>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">
                    Currently has <strong className="text-emerald-400">{member.liked_items.length} likes</strong> and{" "}
                    <strong className="text-rose-400">{member.disliked_items.length} dealbreakers</strong>
                  </p>
                </div>
              </div>

              {/* Quick switch next member button */}
              {state.members.length > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveMember((prev) => (prev + 1) % state.members.length)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-all cursor-pointer self-start sm:self-auto"
                >
                  Next Family Member →
                </button>
              )}
            </div>

            {/* ── Section: Likes & Favorites ─────────────────────────── */}
            <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/25 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <span>👍 Likes &amp; Favorites</span>
                  <span className="text-xs text-emerald-300/80 font-normal normal-case">(required at least 1)</span>
                </label>
                <span className="text-emerald-400 text-xs sm:text-sm font-mono font-bold">
                  {member.liked_items.length} saved
                </span>
              </div>

              {/* Input + Button */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  placeholder={`Add something ${member.nickname} loves (e.g. "${currentSuggestions.likes[0]}")`}
                  value={likeInput}
                  onChange={(e) => setLikeInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, false)}
                  className="wizard-input flex-1 text-base py-3.5"
                />
                <button
                  onClick={() => addPreference(likeInput, false)}
                  disabled={!likeInput.trim()}
                  className="btn-success px-6 py-3.5 rounded-xl text-sm font-bold whitespace-nowrap disabled:opacity-40 cursor-pointer shadow-md"
                >
                  + Add Like
                </button>
              </div>

              {/* Liked Chips */}
              <div className="flex flex-wrap gap-2.5 mb-5 min-h-[36px] items-center">
                {member.liked_items.map((pref, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-100 text-sm font-medium shadow-sm"
                  >
                    <span>{pref.text}</span>
                    <button
                      onClick={() => removePreference(i, false)}
                      className="text-emerald-400 hover:text-white hover:scale-125 transition-all text-sm font-bold ml-1 cursor-pointer"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {member.liked_items.length === 0 && (
                  <span className="text-sm text-slate-400 italic">
                    No likes added yet. Choose from quick suggestions below or enter custom favorites!
                  </span>
                )}
              </div>

              {/* Quick Suggestions */}
              <div className="pt-4 border-t border-emerald-500/15">
                <span className="text-xs sm:text-sm font-semibold text-slate-300 block mb-2.5">
                  Click to add quick suggestion:
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentSuggestions.likes
                    .filter((s) => !member.liked_items.some((l) => l.text.toLowerCase() === s.toLowerCase()))
                    .slice(0, 7)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addPreference(s, false)}
                        className="text-xs sm:text-sm px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-200 hover:text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/15 transition-all cursor-pointer font-medium"
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* ── Section: Dislikes & Dealbreakers ───────────────────── */}
            <div className="p-5 sm:p-6 rounded-2xl bg-rose-500/[0.04] border border-rose-500/25 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <span>👎 Dislikes &amp; Dealbreakers</span>
                  <span className="text-xs text-rose-300/80 font-normal normal-case">(optional, hard vetoes)</span>
                </label>
                <span className="text-rose-400 text-xs sm:text-sm font-mono font-bold">
                  {member.disliked_items.length} saved
                </span>
              </div>

              {/* Input + Button */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  placeholder={`Things ${member.nickname} wants to avoid (e.g. "${currentSuggestions.dislikes[0]}")`}
                  value={dislikeInput}
                  onChange={(e) => setDislikeInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, true)}
                  className="wizard-input flex-1 text-base py-3.5"
                />
                <button
                  onClick={() => addPreference(dislikeInput, true)}
                  disabled={!dislikeInput.trim()}
                  className="btn-danger px-6 py-3.5 rounded-xl text-sm font-bold whitespace-nowrap disabled:opacity-40 cursor-pointer shadow-md"
                >
                  + Add Dislike
                </button>
              </div>

              {/* Disliked Chips */}
              <div className="flex flex-wrap gap-2.5 mb-5 min-h-[36px] items-center">
                {member.disliked_items.map((pref, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-100 text-sm font-medium shadow-sm"
                  >
                    <span>{pref.text}</span>
                    <button
                      onClick={() => removePreference(i, true)}
                      className="text-rose-400 hover:text-white hover:scale-125 transition-all text-sm font-bold ml-1 cursor-pointer"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {member.disliked_items.length === 0 && (
                  <span className="text-sm text-slate-400 italic">
                    No dealbreakers added. Optional, but prevents unwanted genres or cuisines.
                  </span>
                )}
              </div>

              {/* Quick Suggestions */}
              <div className="pt-4 border-t border-rose-500/15">
                <span className="text-xs sm:text-sm font-semibold text-slate-300 block mb-2.5">
                  Click to add quick dealbreaker:
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentSuggestions.dislikes
                    .filter((s) => !member.disliked_items.some((d) => d.text.toLowerCase() === s.toLowerCase()))
                    .slice(0, 5)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addPreference(s, true)}
                        className="text-xs sm:text-sm px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-200 hover:text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/15 transition-all cursor-pointer font-medium"
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Navigation ─────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between pt-6 border-t border-white/[0.1] mt-auto">
        <button
          onClick={prevStep}
          className="btn-secondary text-sm sm:text-base px-6 py-3 rounded-xl cursor-pointer"
        >
          ← Family Cohort
        </button>

        <button
          onClick={nextStep}
          disabled={!allMembersHavePrefs}
          className="btn-primary text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-xl flex items-center gap-3 cursor-pointer disabled:opacity-40 font-bold"
        >
          <span>Continue to Constraints</span>
          <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
}
