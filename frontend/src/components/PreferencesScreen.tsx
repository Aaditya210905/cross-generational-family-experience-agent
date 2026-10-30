/**
 * FusionAI — Preferences Screen (Step 2)
 *
 * Clean two-column layout:
 * - Left: Member navigator with completion status
 * - Right: Active member taste intake (likes & dealbreakers)
 */

"use client";

import { useState } from "react";
import { useFamilyState } from "@/lib/store";
import { resolvePreferences } from "@/lib/api";
import { GENERATION_META } from "@/lib/types";
import type { FamilyMember, Preference, CategoryType } from "@/lib/types";

export default function PreferencesScreen() {
  const { state, dispatch, nextStep, prevStep } = useFamilyState();
  const [activeMember, setActiveMember] = useState(0);
  const [likeInput, setLikeInput] = useState("");
  const [dislikeInput, setDislikeInput] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  const member = state.members[activeMember] || state.members[0];
  if (!member) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center max-w-[1440px] mx-auto w-full">
        <p className="text-base text-text-secondary mb-6">Please add family members first.</p>
        <button onClick={prevStep} className="btn btn--primary text-sm px-6 py-3 rounded-lg cursor-pointer">
          ← Back to family cohort
        </button>
      </div>
    );
  }

  const meta = GENERATION_META[member.generation] || {
    label: "Family Member",
    emoji: "👤",
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

  const resolveAndContinue = async () => {
    setIsResolving(true); setResolutionError(null);
    try {
      const profile = await resolvePreferences({
        category: state.category,
        members: state.members.map((m) => ({ ...m, liked_items: m.liked_items, disliked_items: m.disliked_items })),
      });
      dispatch({ type: "SET_RESOLUTION", profile });
    } catch {
      setResolutionError("We couldn't resolve preferences right now. Please try again; no weak matches will be used.");
    } finally { setIsResolving(false); }
  };

  const resolutions = state.resolutionProfile?.members.flatMap((m) => [
    ...m.resolved_likes.map((item) => ({ ...item, member: m.nickname })),
    ...m.resolved_dislikes.map((item) => ({ ...item, member: m.nickname })),
  ]) || [];

  const updateDecision = (memberId: string, originalText: string, decision: "confirm" | "remove", replacement?: { qloo_id: string; name: string }) => {
    if (!state.resolutionProfile) return;
    const update = (item: { original_text: string; qloo_id: string; name: string; user_confirmed: boolean }) => item.original_text !== originalText ? item : {
      ...item,
      qloo_id: replacement?.qloo_id || item.qloo_id,
      name: replacement?.name || item.name,
      user_confirmed: decision === "confirm",
    };
    dispatch({ type: "SET_RESOLUTION", profile: {
      ...state.resolutionProfile,
      members: state.resolutionProfile.members.map((m) => m.member_id !== memberId ? m : {
        ...m,
        resolved_likes: m.resolved_likes.map(update),
        resolved_dislikes: m.resolved_dislikes.map(update),
        unresolved: decision === "remove" ? [...m.unresolved, originalText] : m.unresolved,
      }),
    }});
  };

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-[1440px] mx-auto w-full relative z-10">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="page-eyebrow inline-block">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-warm inline-block mr-1.5" />
              Step 2 • Taste Signals
            </span>
            <h2 className="page-title">
              What does everyone enjoy?
            </h2>
            <p className="page-subtitle">
              Specify favorites and dealbreakers for each family member. Qloo projects these inputs
              into cultural vectors to identify genuine consensus.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-base bg-white text-text-secondary text-sm font-medium">
            <span className="text-slate-400">Total signals logged:</span>
            <span className="font-bold text-text-primary">{totalLikes} likes</span>
            <span className="text-text-muted">•</span>
            <span className="font-bold text-terracotta">{totalDislikes} dealbreakers</span>
          </div>
        </div>
      </div>

      {state.resolutionProfile && (
        <div className="card mt-6 p-5">
          <h3 className="font-bold text-text-primary mb-3">Confirm taste matches</h3>
          <div className="flex flex-wrap gap-2">
            {resolutions.map((item, index) => (
              <span key={`${item.original_text}-${index}`} className={`px-3 py-2 rounded-lg text-sm border ${item.needs_confirmation ? "border-amber-warm/40 bg-amber-warm-light" : "border-sage/30 bg-sage-light"}`}>
                {item.needs_confirmation ? "?" : "✓"} {item.member}: {item.original_text} → {item.name}
                {item.needs_confirmation && <span className="ml-2 inline-flex gap-1">
                  <button type="button" onClick={() => updateDecision(item.member_id, item.original_text, "confirm")} className="underline font-semibold">Confirm</button>
                  {item.alternatives?.[0] && <button type="button" onClick={() => updateDecision(item.member_id, item.original_text, "confirm", item.alternatives[0])} className="underline">Replace</button>}
                  <button type="button" onClick={() => updateDecision(item.member_id, item.original_text, "remove")} className="underline">Remove</button>
                </span>}
              </span>
            ))}
            {state.resolutionProfile.members.flatMap((m) => m.unresolved.map((text) => <span key={`${m.member_id}-${text}`} className="px-3 py-2 rounded-lg text-sm border border-terracotta/30 bg-terracotta-light">! We couldn’t confidently match ‘{text}’; it won’t be used as a Qloo signal.</span>))}
          </div>
        </div>
      )}
      {resolutionError && <p className="mt-4 text-sm text-terracotta">{resolutionError}</p>}

      {/* ── Two-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ── Left Column: Member Navigator ── */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="card flex flex-col gap-4">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-warm flex items-center gap-1.5">
                  <span>👥</span>
                  <span>Select member</span>
                </span>
                <span className="text-xs font-mono text-text-muted">
                  {state.members.filter((m) => m.liked_items.length > 0).length} / {state.members.length} ready
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {state.members.map((m, idx) => {
                  const mMeta = GENERATION_META[m.generation] || { emoji: "👤", label: "Member" };
                  const hasLikes = m.liked_items.length > 0;
                  const isSelected = idx === activeMember;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMember(idx)}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left cursor-pointer ${
                        isSelected
                          ? "bg-amber-warm-light border-amber-warm/20"
                          : hasLikes
                            ? "bg-sage-light border-sage/20"
                            : "border-border-base bg-white hover:bg-cream-100 hover:border-border-hover"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-cream-100 border border-border-base flex items-center justify-center text-lg flex-shrink-0">
                          {mMeta.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-text-primary truncate">
                            {m.nickname}
                          </div>
                          <div className="text-[11px] text-text-muted">
                            {mMeta.label}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {hasLikes ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sage-light text-sage text-xs font-bold border border-sage/20">
                            <span>✓</span>
                            <span>{m.liked_items.length} likes</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-warm-light text-amber-warm text-xs font-semibold">
                            <span>Needs like</span>
                          </span>
                        )}
                        {m.disliked_items.length > 0 && (
                          <span className="text-[10px] text-terracotta/70 font-medium">
                            {m.disliked_items.length} dealbreakers
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body card-body--sm">
              <h4 className="font-display font-bold text-sm text-text-primary mb-2 flex items-center gap-2">
                <span>💡</span>
                <span>Tip for better matches</span>
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                Adding 2–3 specific titles or cuisines per person yields significantly higher
                recommendation precision than broad generic genres.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column: Active Member Taste Profile ── */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Member banner */}
          <div className="card">
            <div className="card-body">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-border-base">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-cream-100 border border-border-base flex items-center justify-center text-3xl">
                    {meta.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-display font-bold text-xl text-text-primary">{member.nickname}</h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-warm-light border border-amber-warm/20 text-amber-warm">
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Currently has{" "}
                      <strong className="text-text-primary">{member.liked_items.length} likes</strong>{" "}
                      and{" "}
                      <strong className="text-terracotta">{member.disliked_items.length} dealbreakers</strong>
                    </p>
                  </div>
                </div>

                {state.members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveMember((prev) => (prev + 1) % state.members.length)}
                    className="btn btn--ghost text-xs px-3 py-2 rounded-lg self-start sm:self-auto"
                  >
                    Next member →
                  </button>
                )}
              </div>

              {/* Likes section */}
              <div className="mb-8 p-5 rounded-xl bg-amber-warm-light border border-amber-warm/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-warm flex items-center gap-1">
                      <span>👍</span>
                      <span>Likes &amp; favorites</span>
                    </label>
                    <span className="text-[10px] text-amber-warm/80 font-normal ml-1">(at least 1 required)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-warm">
                    {member.liked_items.length} saved
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                    type="text"
                    placeholder={`Add something ${member.nickname} loves (e.g. "${currentSuggestions.likes[0]}")`}
                    value={likeInput}
                    onChange={(e) => setLikeInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, false)}
                    className="field-input flex-1 py-3"
                  />
                  <button
                    onClick={() => addPreference(likeInput, false)}
                    disabled={!likeInput.trim()}
                    className="btn btn--sage px-6 py-3 text-sm font-bold whitespace-nowrap disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    + Add like
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-5 min-h-[40px] items-center">
                  {member.liked_items.map((pref, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-light border border-sage/30 text-sage text-sm font-medium shadow-sm"
                    >
                      <span>{pref.text}</span>
                      <button
                        onClick={() => removePreference(i, false)}
                        className="text-sage/70 hover:text-sage hover:scale-110 transition-all text-sm font-bold ml-1 cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {member.liked_items.length === 0 && (
                    <span className="text-sm text-text-muted italic">
                      No likes added yet. Choose from quick suggestions or enter custom favorites.
                    </span>
                  )}
                </div>

                <div className="pt-4 border-t border-amber-warm/20">
                  <span className="text-xs font-semibold text-text-muted block mb-2.5">
                    Quick suggestions:
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
                          className="text-xs px-3 py-1.5 rounded-full border border-border-base bg-white text-text-secondary hover:bg-amber-warm-light hover:text-amber-warm hover:border-amber-warm/30 transition-all cursor-pointer font-medium"
                        >
                          + {s}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {/* Dislikes section */}
              <div className="p-5 rounded-xl bg-terracotta-light border border-terracotta/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-terracotta flex items-center gap-1">
                      <span>👎</span>
                      <span>Dislikes &amp; dealbreakers</span>
                    </label>
                    <span className="text-[10px] text-terracotta/80 font-normal ml-1">(optional hard vetoes)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-terracotta">
                    {member.disliked_items.length} saved
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                    type="text"
                    placeholder={`Things ${member.nickname} wants to avoid (e.g. "${currentSuggestions.dislikes[0]}")`}
                    value={dislikeInput}
                    onChange={(e) => setDislikeInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, true)}
                    className="field-input flex-1 py-3"
                  />
                  <button
                    onClick={() => addPreference(dislikeInput, true)}
                    disabled={!dislikeInput.trim()}
                    className="btn btn--danger px-6 py-3 text-sm font-bold whitespace-nowrap disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    + Add dislike
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-5 min-h-[40px] items-center">
                  {member.disliked_items.map((pref, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terracotta-light border border-terracotta/30 text-terracotta text-sm font-medium shadow-sm"
                    >
                      <span>{pref.text}</span>
                      <button
                        onClick={() => removePreference(i, true)}
                        className="text-terracotta/70 hover:text-terracotta hover:scale-110 transition-all text-sm font-bold ml-1 cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {member.disliked_items.length === 0 && (
                    <span className="text-sm text-text-muted italic">
                      No dealbreakers added. Optional, but prevents unwanted genres or cuisines.
                    </span>
                  )}
                </div>

                <div className="pt-4 border-t border-terracotta/20">
                  <span className="text-xs font-semibold text-text-muted block mb-2.5">
                    Quick dealbreakers:
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
                          className="text-xs px-3 py-1.5 rounded-full border border-border-base bg-white text-text-secondary hover:bg-terracotta-light hover:text-terracotta hover:border-terracotta/30 transition-all cursor-pointer font-medium"
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
      </div>

      {/* ── Footer Navigation ── */}
      <div className="w-full flex items-center justify-between pt-8 border-t border-border-base mt-auto">
        <button
          onClick={prevStep}
          className="btn btn--secondary text-sm px-6 py-3 rounded-lg cursor-pointer"
        >
          ← Family cohort
        </button>

        <button
          onClick={state.resolutionProfile ? nextStep : resolveAndContinue}
          disabled={!allMembersHavePrefs}
          className="btn btn--primary text-sm px-8 py-3.5 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 font-bold"
        >
          <span>{isResolving ? "Resolving preferences…" : state.resolutionProfile ? "Continue to constraints" : "Resolve preferences"}</span>
          <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
}
