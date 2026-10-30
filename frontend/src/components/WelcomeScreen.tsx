/**
 * FamilyFusion AI — Welcome Screen (Step 0)
 *
 * Futuristic landing experience featuring:
 * - Cyberpunk/Glassmorphic Hero with gradient typography
 * - Interactive category cards with glowing borders
 * - Bento-grid demo family dossiers with 1-click instant load
 * - Holographic feature cards highlighting Qloo taste intelligence
 */

"use client";

import { useState, useEffect } from "react";
import { useFamilyState } from "@/lib/store";
import { getDemoFamilies, getDemoFamily } from "@/lib/api";
import { CATEGORY_META } from "@/lib/types";
import type { CategoryType, FamilyMember, GenerationLabel } from "@/lib/types";

export default function WelcomeScreen() {
  const { state, dispatch, nextStep } = useFamilyState();
  const [demos, setDemos] = useState<
    Array<{
      family_id: string;
      label: string;
      description: string;
      member_count: number;
      category: string;
      members: Array<{
        nickname: string;
        generation: string;
        avatar_emoji?: string;
        liked_count?: number;
      }>;
    }>
  >([]);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    getDemoFamilies()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDemos(data);
        } else {
          // Robust fallback demo presets
          setDemos([
            {
              family_id: "demo-sharma",
              label: "The Sharma Family — Three Generations",
              description: "Nani (grandparent), Priya (parent), Arjun (teen) — Bollywood meets anime & modern Marvel.",
              member_count: 3,
              category: "movies",
              members: [
                { nickname: "Nani", generation: "grandparent", avatar_emoji: "👵🏽" },
                { nickname: "Priya", generation: "parent", avatar_emoji: "👩🏽" },
                { nickname: "Arjun", generation: "teen", avatar_emoji: "🧑🏽" },
              ],
            },
            {
              family_id: "demo-tanaka-rodriguez",
              label: "The Tanaka-Rodriguez Family — Cross-Cultural",
              description: "Carlos (Mexican), Yuki (Japanese), Sofia (Gen-Z) — High-flavor culinary crossover.",
              member_count: 3,
              category: "restaurants",
              members: [
                { nickname: "Carlos", generation: "parent", avatar_emoji: "👨🏽" },
                { nickname: "Yuki", generation: "parent", avatar_emoji: "👩🏻" },
                { nickname: "Sofia", generation: "teen", avatar_emoji: "👧🏻" },
              ],
            },
            {
              family_id: "demo-williams",
              label: "The Williams Family — Adventure Seekers",
              description: "Grandpa Bob (wheelchair access), Dad Mike, Zoe (13), Sam (10) — Sci-fi, Disney & mobility friendly.",
              member_count: 4,
              category: "movies",
              members: [
                { nickname: "Grandpa Bob", generation: "grandparent", avatar_emoji: "👴🏼" },
                { nickname: "Dad Mike", generation: "parent", avatar_emoji: "👨🏼" },
                { nickname: "Zoe", generation: "teen", avatar_emoji: "👧🏼" },
                { nickname: "Sam", generation: "child", avatar_emoji: "👦🏼" },
              ],
            },
          ]);
        }
      })
      .catch((err) => {
        console.warn("Could not load demos from backend, using fallback presets:", err);
        setDemos([
          {
            family_id: "demo-sharma",
            label: "The Sharma Family — Three Generations",
            description: "Nani (grandparent), Priya (parent), Arjun (teen) — Bollywood meets anime & Marvel.",
            member_count: 3,
            category: "movies",
            members: [
              { nickname: "Nani", generation: "grandparent", avatar_emoji: "👵🏽" },
              { nickname: "Priya", generation: "parent", avatar_emoji: "👩🏽" },
              { nickname: "Arjun", generation: "teen", avatar_emoji: "🧑🏽" },
            ],
          },
          {
            family_id: "demo-tanaka-rodriguez",
            label: "The Tanaka-Rodriguez Family — Cross-Cultural",
            description: "Carlos (Mexican), Yuki (Japanese), Sofia (Gen-Z) — Fusion dining adventure.",
            member_count: 3,
            category: "restaurants",
            members: [
              { nickname: "Carlos", generation: "parent", avatar_emoji: "👨🏽" },
              { nickname: "Yuki", generation: "parent", avatar_emoji: "👩🏻" },
              { nickname: "Sofia", generation: "teen", avatar_emoji: "👧🏻" },
            ],
          },
          {
            family_id: "demo-williams",
            label: "The Williams Family — Adventure Seekers",
            description: "Grandpa Bob (wheelchair), Dad Mike, Zoe (13), Sam (10) — Accessible sci-fi outings.",
            member_count: 4,
            category: "movies",
            members: [
              { nickname: "Grandpa Bob", generation: "grandparent", avatar_emoji: "👴🏼" },
              { nickname: "Dad Mike", generation: "parent", avatar_emoji: "👨🏼" },
              { nickname: "Zoe", generation: "teen", avatar_emoji: "👧🏼" },
              { nickname: "Sam", generation: "child", avatar_emoji: "👦🏼" },
            ],
          },
        ]);
      });
  }, []);

  const handleLoadDemo = async (familyId: string) => {
    setLoadingDemo(familyId);
    try {
      const data = await getDemoFamily(familyId);
      const profile = data.profile as Record<string, unknown> | undefined;
      if (profile && Array.isArray(profile.members)) {
        const members: FamilyMember[] = (profile.members as Record<string, unknown>[]).map((m) => ({
          id: (m.id as string) || `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          nickname: m.nickname as string,
          generation: m.generation as GenerationLabel,
          avatar_emoji: (m.avatar_emoji as string) || "👤",
          liked_items: Array.isArray(m.liked_items)
            ? (m.liked_items as string[]).map((item: string) => ({
                text: typeof item === "string" ? item : (item as Record<string, string>).text || "",
                category: (profile.category as CategoryType) || "movies",
                is_dislike: false,
              }))
            : [],
          disliked_items: Array.isArray(m.disliked_items)
            ? (m.disliked_items as string[]).map((item: string) => ({
                text: typeof item === "string" ? item : (item as Record<string, string>).text || "",
                category: (profile.category as CategoryType) || "movies",
                is_dislike: true,
              }))
            : [],
        }));
        const cat = (profile.category as CategoryType) || "movies";
        dispatch({ type: "LOAD_DEMO", members, category: cat });
      } else {
        setFetchError("Invalid demo family data.");
      }
    } catch {
      // Fallback local load
      if (familyId === "demo-sharma") {
        dispatch({
          type: "LOAD_DEMO",
          category: "movies",
          members: [
            {
              id: "sharma-nani",
              nickname: "Nani",
              generation: "grandparent",
              avatar_emoji: "👵🏽",
              liked_items: [
                { text: "Mughal-e-Azam", category: "movies", is_dislike: false },
                { text: "Sholay", category: "movies", is_dislike: false },
                { text: "Mother India", category: "movies", is_dislike: false },
              ],
              disliked_items: [{ text: "horror movies", category: "movies", is_dislike: true }],
            },
            {
              id: "sharma-priya",
              nickname: "Priya",
              generation: "parent",
              avatar_emoji: "👩🏽",
              liked_items: [
                { text: "Parasite", category: "movies", is_dislike: false },
                { text: "Dune", category: "movies", is_dislike: false },
              ],
              disliked_items: [],
            },
            {
              id: "sharma-arjun",
              nickname: "Arjun",
              generation: "teen",
              avatar_emoji: "🧑🏽",
              liked_items: [
                { text: "Spider-Verse", category: "movies", is_dislike: false },
                { text: "Avengers Endgame", category: "movies", is_dislike: false },
              ],
              disliked_items: [{ text: "slow documentaries", category: "movies", is_dislike: true }],
            },
          ],
        });
      } else {
        setFetchError("Failed to load demo family.");
      }
    } finally {
      setLoadingDemo(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-10 md:py-16 relative z-10 max-w-[1440px] mx-auto w-full">
      {/* ── Futuristic Hero ────────────────────────────────────────── */}
      <div className="text-center max-w-4xl mx-auto mb-12">
        {/* Top Floating Badge */}
        <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 border border-violet-400/40 text-violet-300 text-xs sm:text-sm font-semibold mb-6 shadow-[0_0_30px_rgba(139,92,246,0.25)]">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#a78bfa]" />
          <span>Cultural AI Taste Intelligence</span>
          <span className="text-slate-500">•</span>
          <span className="text-fuchsia-300">Qloo Powered</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-300">Fairness Consensus Engine</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.12]">
          Unite Every Generation
          <br />
          <span className="text-gradient">
            In One Shared Experience
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          No more movie arguments or dinner stalemates. Map cultural taste overlaps across all ages — discover restaurants, films, and outings the whole family genuinely loves.
        </p>
      </div>

      {/* ── Category Selector Bar ──────────────────────────────────── */}
      <div className="w-full max-w-3xl mb-12 text-center">
        <p className="text-xs sm:text-sm uppercase tracking-widest text-slate-400 font-bold mb-3.5">
          Select Your Activity Domain
        </p>
        <div className="grid grid-cols-3 gap-3 p-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-xl">
          {(Object.entries(CATEGORY_META) as [CategoryType, typeof CATEGORY_META["movies"]][]).map(
            ([key, meta]) => {
              const isSelected = state.category === key;
              return (
                <button
                  key={key}
                  onClick={() => dispatch({ type: "SET_CATEGORY", category: key })}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-[0_0_24px_rgba(139,92,246,0.5)] border border-violet-400/50 scale-[1.02]"
                      : "hover:bg-white/[0.06] text-slate-300 hover:text-white"
                  }`}
                >
                  <span className="text-2xl">{meta.emoji}</span>
                  <span className="text-sm sm:text-base font-semibold">{meta.label}</span>
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* ── Primary Action Callout ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
        <button
          onClick={nextStep}
          className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-4 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.5)] flex items-center gap-3 hover:scale-105 transition-all cursor-pointer font-bold"
        >
          <span>✨ Build Custom Family Profile</span>
          <span className="text-xl">→</span>
        </button>
      </div>

      {/* ── Divider with Neon Accent ────────────────────────────────── */}
      <div className="w-full max-w-5xl flex items-center gap-4 mb-10">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <span className="text-xs sm:text-sm uppercase tracking-widest text-slate-300 font-bold px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] shadow-sm">
          ⚡ Or Explore Pre-Engineered Demographics
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      {/* ── Bento Grid: Demo Family Dossiers ───────────────────────── */}
      <div className="w-full max-w-[1440px] mb-16">
        {fetchError && (
          <p className="text-center text-amber-400 text-sm mb-4">{fetchError}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {demos.map((demo) => (
            <div
              key={demo.family_id}
              className="demo-card group flex flex-col justify-between p-6 sm:p-7 border border-violet-500/20 bg-[rgba(16,20,36,0.85)] hover:border-violet-400/60 transition-all rounded-2xl"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                    {demo.category === "movies" ? "🎬 Movies & Shows" : demo.category === "restaurants" ? "🍽️ Dining" : "🎯 Outings"}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 font-mono font-medium">
                    {demo.member_count} Members
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-extrabold text-lg sm:text-xl text-white mb-2.5 group-hover:text-violet-300 transition-colors">
                  {demo.label}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                  {demo.description}
                </p>

                {/* Member Avatars Stack */}
                {demo.members && demo.members.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {demo.members.map((m) => (
                      <span
                        key={m.nickname}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-xs sm:text-sm text-slate-200 border border-white/[0.1]"
                      >
                        <span className="text-base">{m.avatar_emoji || "👤"}</span>
                        <span className="font-semibold">{m.nickname}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleLoadDemo(demo.family_id)}
                disabled={loadingDemo !== null}
                className="w-full py-3.5 px-4 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 group-hover:border-violet-400/50 border border-violet-500/30 text-sm font-bold text-violet-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingDemo === demo.family_id ? (
                  <span className="animate-pulse">Loading AI Profile...</span>
                ) : (
                  <>
                    <span>⚡ Launch Family Scenario</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Holographic Feature Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1440px] w-full mb-16">
        {[
          {
            icon: "🧠",
            title: "Qloo Cultural Vectors",
            desc: "Understands high-dimensional taste connections across genres, eras, and cultures with zero cold-start delay.",
            gradient: "from-violet-500/10 to-purple-500/5",
            accent: "text-violet-400",
          },
          {
            icon: "⚖️",
            title: "Fairness-Weighted Scoring",
            desc: "Enforces satisfaction floor constraints so no family member's preferences are drowned out by the majority.",
            gradient: "from-cyan-500/10 to-blue-500/5",
            accent: "text-cyan-400",
          },
          {
            icon: "💡",
            title: "Grounded LLM Explanations",
            desc: "Explains precisely why each recommendation bridges the family's generation gap with transparent, factual reasons.",
            gradient: "from-pink-500/10 to-rose-500/5",
            accent: "text-pink-400",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className={`feature-card p-6 sm:p-7 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-white/10`}
          >
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className={`font-bold text-lg mb-2 ${feature.accent}`}>
              {feature.title}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="text-center text-sm text-slate-400 font-medium pb-8">
        Powered by <span className="text-violet-400 font-semibold">Qloo Cultural Intelligence API</span> &amp;{" "}
        <span className="text-fuchsia-400 font-semibold">Groq AI Acceleration</span>
      </div>
    </div>
  );
}
