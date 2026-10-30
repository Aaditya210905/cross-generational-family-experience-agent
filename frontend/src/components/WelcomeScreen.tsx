/**
 * FusionAI — Welcome Screen (Step 0)
 *
 * Clean warm editorial landing experience:
 * - Centered hero with headline and subtitle
 * - Activity category selection
 * - Primary CTA to build a custom family profile
 * - Demo family cards for instant exploration
 * - Feature highlights
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
          setDemos([
            {
              family_id: "demo-sharma",
              label: "The Sharma Family",
              description: "Three generations — Bollywood classics meet anime and modern Marvel.",
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
              label: "The Tanaka-Rodriguez Family",
              description: "Cross-cultural household — high-flavor culinary crossover.",
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
              label: "The Williams Family",
              description: "Adventure seekers — sci-fi, Disney, and mobility-friendly outings.",
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
            label: "The Sharma Family",
            description: "Three generations — Bollywood classics meet anime and modern Marvel.",
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
            label: "The Tanaka-Rodriguez Family",
            description: "Cross-cultural household — high-flavor culinary crossover.",
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
            label: "The Williams Family",
            description: "Adventure seekers — sci-fi, Disney, and mobility-friendly outings.",
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
    <div className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 max-w-[1440px] mx-auto w-full">
      {/* ── Hero ── */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="page-eyebrow inline-block">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-warm inline-block mr-1.5" />
          Cultural Taste Intelligence • Powered by Qloo
        </span>

        <h1 className="page-title">
          Find experiences every generation loves
        </h1>

        <p className="page-subtitle">
          No more movie arguments or dinner stalemates. Map cultural taste overlaps across all
          ages — discover restaurants, films, and outings the whole family genuinely enjoys.
        </p>
      </div>

      {/* ── Category Selector ── */}
      <div className="w-full max-w-3xl mb-16">
        <div className="field-label text-center mb-3">
          Select Your Activity Domain
        </div>
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl border border-border-base bg-white shadow-soft">
          {(Object.entries(CATEGORY_META) as [CategoryType, typeof CATEGORY_META["movies"]][]).map(
            ([key, meta]) => {
              const isSelected = state.category === key;
              return (
                <button
                  key={key}
                  onClick={() => dispatch({ type: "SET_CATEGORY", category: key })}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg transition-all duration-300 cursor-pointer text-sm font-medium ${
                    isSelected
                      ? "bg-amber-warm text-white border border-amber-warm"
                      : "bg-white text-text-secondary border-transparent hover:bg-cream-100 hover:text-text-primary hover:border-border-hover"
                  }`}
                >
                  <span className="text-lg">{meta.emoji}</span>
                  <span>{meta.label}</span>
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* ── Primary CTA ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 max-w-2xl mx-auto">
        <button
          onClick={nextStep}
          className="btn btn--primary btn--lg flex items-center gap-2.5 justify-center w-full sm:w-auto text-center sm:text-left"
        >
          <span>Build custom family profile</span>
          <span className="text-xl">→</span>
        </button>
      </div>

      {/* ── Divider ── */}
      <div className="w-full max-w-4xl flex items-center gap-3 mb-12">
        <div className="flex-1 h-[1px] bg-border-base" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-text-muted px-3">
          Or explore pre-built family scenarios
        </span>
        <div className="flex-1 h-[1px] bg-border-base" />
      </div>

      {/* ── Demo Families ── */}
      <div className="w-full max-w-[1440px] mb-16">
        {fetchError && (
          <p className="text-center text-terracotta text-sm mb-4">{fetchError}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {demos.map((demo) => (
            <div
              key={demo.family_id}
              className="card card--raised flex flex-col justify-between p-5 sm:p-6 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="badge badge--source">
                    {demo.member_count} members
                  </span>
                  <span className="text-[10px] font-bold uppercase text-text-muted">
                    {demo.category === "movies" ? "Movies & Shows" : demo.category === "restaurants" ? "Dining" : "Outings"}
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg text-text-primary mb-1.5 group-hover:text-amber-warm transition-colors">
                  {demo.label}
                </h3>

                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {demo.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {demo.members.map((m) => (
                    <span
                      key={m.nickname}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cream-100 border border-border-base text-xs text-text-secondary font-medium"
                    >
                      <span className="text-sm">{m.avatar_emoji || "👤"}</span>
                      <span>{m.nickname}</span>
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleLoadDemo(demo.family_id)}
                disabled={loadingDemo !== null}
                className="w-full btn btn--secondary text-sm py-2.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Load scenario</span>
                <span className="text-sm">→</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1440px] w-full mb-12">
        {[
          {
            icon: "🧠",
            title: "Qloo Cultural Vectors",
            desc: "Understands high-dimensional taste connections across genres, eras, and cultures.",
          },
          {
            icon: "⚖️",
            title: "Fairness-Weighted Scoring",
            desc: "Ensures no family member&apos;s preferences are drowned out by the majority.",
          },
          {
            icon: "💡",
            title: "Grounded Explanations",
            desc: "Explains why each recommendation bridges the generation gap.",
          },
        ].map((feature) => (
          <div key={feature.title} className="card p-5 sm:p-6">
            <div className="text-2xl mb-3">{feature.icon}</div>
            <h4 className="font-display font-bold text-base text-text-primary mb-2">
              {feature.title}
            </h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="text-center text-sm text-text-muted font-medium pb-4">
        Powered by{" "}
        <span className="text-text-primary font-semibold">Qloo Cultural Intelligence API</span>
      </div>
    </div>
  );
}
