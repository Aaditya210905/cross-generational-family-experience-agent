/**
 * FamilyFusion AI — Preferences Screen (Step 2)
 *
 * Futuristic preference intake interface:
 * - Segmented member tabs with avatar badges and completion status
 * - Dual liked/disliked cards with quick suggestion pills
 * - Live cohort taste matrix overview
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-slate-400 mb-4">Please add family members first.</p>
        <button onClick={prevStep} className="btn-primary text-sm">
          ← Back to Family
        </button>
      </div>
    );
  }

  const meta = GENERATION_META[member.generation] || {
    label: "Family Member",
    emoji: "👤",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
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
      likes: ["Spirited Away", "The Godfather", "Spider-Verse", "Bollywood classics", "Studio Ghibli", "Marvel Cinematic", "Inception", "Coco"],
      dislikes: ["Horror & gore", "Excessive violence", "Very long 3hr+ films", "Black & white"],
    },
    restaurants: {
      likes: ["Italian handmade pasta", "Fresh Sushi", "Smoked BBQ", "Authentic Indian curry", "Thai street food", "Mexican Tacos", "Mediterranean tapas"],
      dislikes: ["Extreme spicy peppers", "Greasy fast food", "Raw seafood", "Noisy club dining"],
    },
    activities: {
      likes: ["Scenic hiking", "Board game cafe", "Art & science museum", "Escape room challenge", "Beach sunset", "Miniature golf", "Botanical garden"],
      dislikes: ["Extreme heights", "Loud concerts", "Strenuous climbing", "Stuffy enclosed spaces"],
    },
  };

  const currentSuggestions = suggestions[state.category] || suggestions.movies;

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 pb-20 relative z-10 max-w-4xl mx-auto w-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-3">
          <span>Step 2 • Taste Signals</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          ❤️ What Does Everyone Enjoy?
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Add specific movies, cuisines, or activities each person loves. Qloo converts these into taste vector affinities.
        </p>
      </div>

      {/* ── Member Segmented Selector ─────────────────────────────── */}
      <div className="w-full flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
        {state.members.map((m, idx) => {
          const mMeta = GENERATION_META[m.generation] || { emoji: "👤" };
          const hasPrefs = m.liked_items.length > 0;
          const isSelected = idx === activeMember;

          return (
            <button
              key={m.id}
              onClick={() => setActiveMember(idx)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl whitespace-nowrap text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] scale-105"
                  : hasPrefs
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15"
                    : "bg-white/[0.04] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <span className="text-lg">{mMeta.emoji}</span>
              <span>{m.nickname}</span>
              {hasPrefs ? (
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                  ✓
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Active Member Intake Card ─────────────────────────────── */}
      <div className="glass-card p-6 md:p-8 mb-6 w-full border border-indigo-500/25 shadow-2xl">
        {/* Member Profile Banner */}
        <div className="flex items-center gap-4 mb-7 pb-5 border-b border-white/[0.08]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center text-3xl shadow-inner">
            {meta.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xl text-white">{member.nickname}</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/20">
                {meta.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Currently has <span className="text-emerald-400 font-semibold">{member.liked_items.length} likes</span> and{" "}
              <span className="text-rose-400 font-semibold">{member.disliked_items.length} dislikes</span>
            </p>
          </div>
        </div>

        {/* ── Section: Likes ────────────────────────────────────────── */}
        <div className="mb-8 p-5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20">
          <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
            <span className="flex items-center gap-2">
              <span>👍 Likes &amp; Favorites</span>
              <span className="text-[10px] text-emerald-300/70 font-normal lowercase">(required at least 1)</span>
            </span>
            <span className="text-emerald-400 text-xs font-mono">{member.liked_items.length} items</span>
          </label>

          {/* Input & Add */}
          <div className="flex gap-2.5 mb-3.5">
            <input
              type="text"
              placeholder={`Add something ${member.nickname} loves (e.g. "${currentSuggestions.likes[0]}")`}
              value={likeInput}
              onChange={(e) => setLikeInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, false)}
              className="wizard-input flex-1"
            />
            <button
              onClick={() => addPreference(likeInput, false)}
              disabled={!likeInput.trim()}
              className="btn-success px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-40"
            >
              + Add Like
            </button>
          </div>

          {/* Liked Chips */}
          <div className="flex flex-wrap gap-2 mb-4 min-h-[32px] items-center">
            {member.liked_items.map((pref, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-medium shadow-sm"
              >
                <span>{pref.text}</span>
                <button
                  onClick={() => removePreference(i, false)}
                  className="text-emerald-400/60 hover:text-rose-400 hover:scale-125 transition-all text-xs font-bold ml-1 cursor-pointer"
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            ))}
            {member.liked_items.length === 0 && (
              <span className="text-xs text-slate-500 italic">
                No likes added yet. Click suggestions below or type your own!
              </span>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-emerald-500/10">
            <span className="text-[11px] font-semibold text-slate-400">Quick Suggestions:</span>
            {currentSuggestions.likes
              .filter((s) => !member.liked_items.some((l) => l.text.toLowerCase() === s.toLowerCase()))
              .slice(0, 5)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => addPreference(s, false)}
                  className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all cursor-pointer"
                >
                  + {s}
                </button>
              ))}
          </div>
        </div>

        {/* ── Section: Dislikes ─────────────────────────────────────── */}
        <div className="p-5 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20">
          <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">
            <span className="flex items-center gap-2">
              <span>👎 Dislikes &amp; Dealbreakers</span>
              <span className="text-[10px] text-rose-300/70 font-normal lowercase">(optional)</span>
            </span>
            <span className="text-rose-400 text-xs font-mono">{member.disliked_items.length} items</span>
          </label>

          {/* Input & Add */}
          <div className="flex gap-2.5 mb-3.5">
            <input
              type="text"
              placeholder={`Things ${member.nickname} wants to avoid (e.g. "${currentSuggestions.dislikes[0]}")`}
              value={dislikeInput}
              onChange={(e) => setDislikeInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, true)}
              className="wizard-input flex-1"
            />
            <button
              onClick={() => addPreference(dislikeInput, true)}
              disabled={!dislikeInput.trim()}
              className="btn-danger px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-40"
            >
              + Add Dislike
            </button>
          </div>

          {/* Disliked Chips */}
          <div className="flex flex-wrap gap-2 mb-4 min-h-[32px] items-center">
            {member.disliked_items.map((pref, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-medium shadow-sm"
              >
                <span>{pref.text}</span>
                <button
                  onClick={() => removePreference(i, true)}
                  className="text-rose-400/60 hover:text-white hover:scale-125 transition-all text-xs font-bold ml-1 cursor-pointer"
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            ))}
            {member.disliked_items.length === 0 && (
              <span className="text-xs text-slate-500 italic">
                No dislikes added yet. Optional, but helps avoid bad picks!
              </span>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-rose-500/10">
            <span className="text-[11px] font-semibold text-slate-400">Quick Suggestions:</span>
            {currentSuggestions.dislikes
              .filter((s) => !member.disliked_items.some((d) => d.text.toLowerCase() === s.toLowerCase()))
              .slice(0, 4)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => addPreference(s, true)}
                  className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  + {s}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* ── Cohort Preferences Matrix ─────────────────────────────── */}
      <div className="w-full glass-card p-5 mb-8 border border-white/[0.08]">
        <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3 flex items-center justify-between">
          <span>📋 Cohort Readiness Matrix</span>
          <span className="text-indigo-400 font-mono">
            {state.members.filter((m) => m.liked_items.length > 0).length} of {state.members.length} ready
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {state.members.map((m) => {
            const mMeta = GENERATION_META[m.generation] || { emoji: "👤" };
            const isReady = m.liked_items.length > 0;
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isReady
                    ? "bg-emerald-500/[0.06] border-emerald-500/25"
                    : "bg-white/[0.03] border-white/10"
                }`}
              >
                <div className="text-xl">{mMeta.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-white truncate">{m.nickname}</div>
                  <div className="text-[10px] text-slate-400">{mMeta.label}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400">{m.liked_items.length} 👍</div>
                  <div className="text-[10px] text-rose-400">{m.disliked_items.length} 👎</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer Navigation ─────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between pt-5 border-t border-white/[0.08]">
        <button onClick={prevStep} className="btn-secondary text-sm px-5 py-2.5">
          ← Family Cohort
        </button>

        <button
          onClick={nextStep}
          disabled={!allMembersHavePrefs}
          className="btn-primary text-sm px-7 py-3 rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-40"
        >
          <span>Configure Constraints</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
