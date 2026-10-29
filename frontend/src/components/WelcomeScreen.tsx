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
    Record<string, { name: string; description: string; member_count: number }>
  >({});
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    getDemoFamilies()
      .then(setDemos)
      .catch((err) => {
        console.warn("Could not load demos:", err);
        setFetchError("Backend not reachable — start it to load demo families.");
      });
  }, []);

  const handleLoadDemo = async (key: string) => {
    setLoadingDemo(key);
    try {
      const data = await getDemoFamily(key);
      const members: FamilyMember[] = data.members.map((m) => ({
        id: m.id,
        nickname: m.nickname,
        generation: m.generation as GenerationLabel,
        liked_items: m.liked_items.map((l) => ({
          text: l.text,
          category: l.category as CategoryType,
          is_dislike: false,
        })),
        disliked_items: m.disliked_items.map((d) => ({
          text: d.text,
          category: d.category as CategoryType,
          is_dislike: true,
        })),
      }));
      dispatch({ type: "LOAD_DEMO", members, category: "movies" });
    } catch {
      setFetchError("Failed to load demo family.");
    } finally {
      setLoadingDemo(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="text-6xl mb-4">🏠</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          FamilyFusion AI
        </h1>
        <p className="text-lg text-[var(--ff-text-muted)] max-w-xl mx-auto leading-relaxed">
          Discover experiences your whole family will love — from grandparents to
          teens. Powered by{" "}
          <span className="text-indigo-400 font-semibold">Qloo taste intelligence</span>.
        </p>
      </div>

      {/* Category Selector */}
      <div className="mb-10">
        <p className="text-sm text-[var(--ff-text-muted)] text-center mb-3 font-medium">
          What are you looking for?
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {(Object.entries(CATEGORY_META) as [CategoryType, typeof CATEGORY_META["movies"]][]).map(
            ([key, meta]) => (
              <button
                key={key}
                onClick={() => dispatch({ type: "SET_CATEGORY", category: key })}
                className={`chip text-base px-5 py-2.5 ${
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

      {/* Start Button */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <button onClick={nextStep} className="btn-primary text-lg px-8 py-3">
          Build Your Family Profile →
        </button>
      </div>

      {/* Demo Families */}
      <div className="w-full max-w-2xl">
        <p className="text-sm text-[var(--ff-text-muted)] text-center mb-4 font-medium">
          ⚡ Quick Start — Load a demo family
        </p>
        {fetchError && (
          <p className="text-center text-amber-400 text-sm mb-3">{fetchError}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(demos).map(([key, demo]) => (
            <button
              key={key}
              onClick={() => handleLoadDemo(key)}
              disabled={loadingDemo !== null}
              className="glass-card p-4 text-left hover:border-indigo-500/40 transition-all group"
            >
              <div className="font-semibold text-sm mb-1 group-hover:text-indigo-400 transition-colors">
                {demo.name}
              </div>
              <div className="text-xs text-[var(--ff-text-muted)] mb-2 line-clamp-2">
                {demo.description}
              </div>
              <div className="text-xs text-indigo-400">
                {loadingDemo === key ? "Loading..." : `${demo.member_count} members`}
              </div>
            </button>
          ))}
          {Object.keys(demos).length === 0 && !fetchError && (
            <div className="col-span-3 text-center text-sm text-[var(--ff-text-muted)] animate-pulse-soft">
              Loading demo families...
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mt-14">
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
          <div key={feature.title} className="text-center px-4">
            <div className="text-3xl mb-2">{feature.icon}</div>
            <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
            <p className="text-xs text-[var(--ff-text-muted)]">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

