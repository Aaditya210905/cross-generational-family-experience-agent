/**
 * FamilyFusion AI — Welcome Screen (Step 0)
 *
 * Landing page with hero, feature highlights, and demo family quickstart.
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
        if (Array.isArray(data)) {
          setDemos(data);
        } else {
          const arr = Object.entries(data as Record<string, Record<string, unknown>>).map(([key, val]) => ({
            family_id: key,
            label: (val.name as string) || key,
            description: (val.description as string) || "",
            member_count: (val.member_count as number) || 0,
            category: "movies",
            members: [],
          }));
          setDemos(arr);
        }
      })
      .catch((err) => {
        console.warn("Could not load demos:", err);
        setFetchError("Backend not reachable — start it to load demo families.");
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
      setFetchError("Failed to load demo family.");
    } finally {
      setLoadingDemo(null);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "movies": return "🎬";
      case "restaurants": return "🍽️";
      case "activities": return "🎯";
      default: return "🎬";
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-16 relative z-10">
      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="text-5xl mb-5">🏠</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-tight">
          FamilyFusion AI
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
          Discover experiences your whole family will love — from grandparents to
          teens. Powered by{" "}
          <span className="text-indigo-400 font-semibold">Qloo taste intelligence</span>.
        </p>
      </div>

      {/* ── Category Selector ─────────────────────────────── */}
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3 font-semibold">
          What are you looking for?
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {(Object.entries(CATEGORY_META) as [CategoryType, typeof CATEGORY_META["movies"]][]).map(
            ([key, meta]) => (
              <button
                key={key}
                onClick={() => dispatch({ type: "SET_CATEGORY", category: key })}
                className={`chip text-sm px-5 py-2 ${
                  state.category === key ? "chip-active" : ""
                }`}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            ),
          )}
        </div>
      </div>

      {/* ── CTA Button ────────────────────────────────────── */}
      <button
        onClick={nextStep}
        className="btn-primary text-base px-10 py-3.5 mb-16 rounded-xl shadow-lg hover:shadow-xl transition-all"
      >
        Build Your Family Profile →
      </button>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="w-full max-w-3xl flex items-center gap-4 mb-10">
        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
        <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold whitespace-nowrap">
          or try a demo
        </span>
        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
      </div>

      {/* ── Demo Family Cards ─────────────────────────────── */}
      <div className="w-full max-w-3xl mb-16">
        {fetchError && (
          <p className="text-center text-amber-400 text-sm mb-4">{fetchError}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {demos.map((demo) => (
            <button
              key={demo.family_id}
              onClick={() => handleLoadDemo(demo.family_id)}
              disabled={loadingDemo !== null}
              className="demo-card group"
            >
              {/* Card header */}
              <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1.5 group-hover:text-indigo-400 transition-colors leading-snug">
                {demo.label}
              </h3>

              {/* Description */}
              <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed line-clamp-2">
                {demo.description}
              </p>

              {/* Member pills */}
              {demo.members && demo.members.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {demo.members.map((m) => (
                    <span
                      key={m.nickname}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-glass)] text-[10px] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                    >
                      {m.avatar_emoji || "👤"} {m.nickname}
                    </span>
                  ))}
                </div>
              )}

              {/* Category badge */}
              <div className="mt-auto pt-2 border-t border-[var(--border-subtle)]">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400">
                  {loadingDemo === demo.family_id ? (
                    <>
                      <span className="animate-pulse-soft">Loading...</span>
                    </>
                  ) : (
                    <>
                      {getCategoryIcon(demo.category)} {demo.category}
                      <span className="text-[var(--text-muted)] font-normal ml-1">
                        · {demo.member_count} members
                      </span>
                    </>
                  )}
                </span>
              </div>
            </button>
          ))}
          {demos.length === 0 && !fetchError && (
            <div className="col-span-3 text-center text-sm text-[var(--text-muted)] animate-pulse-soft py-8">
              Loading demo families...
            </div>
          )}
        </div>
      </div>

      {/* ── Features ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl w-full">
        {[
          {
            icon: "🎯",
            title: "Taste Intelligence",
            desc: "Qloo's AI understands what each person loves — across every generation.",
          },
          {
            icon: "⚖️",
            title: "Fair for Everyone",
            desc: "Our scoring ensures no one gets left out. Even Grandma's preferences count.",
          },
          {
            icon: "🔍",
            title: "Fully Transparent",
            desc: "See exactly why each recommendation was chosen — no black boxes.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="feature-card"
          >
            <div className="text-3xl mb-3">{feature.icon}</div>
            <h3 className="font-bold text-sm mb-1.5 text-[var(--text-primary)]">
              {feature.title}
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="mt-16 text-center text-xs text-[var(--text-muted)]">
        Powered by <a href="https://qloo.com" className="text-indigo-400 hover:underline">Qloo</a> — Cultural taste intelligence
      </div>
    </div>
  );
}
