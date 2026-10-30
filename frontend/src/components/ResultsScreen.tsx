/**
 * FusionAI — Results Screen (Step 4)
 *
 * Full results experience integrating the multi-agent pipeline:
 * 1. Agent trace panel (live progress & algorithm steps)
 * 2. Ranked recommendation cards with fairness breakdown
 * 3. Interactive feedback loop with live refinement
 * 4. Robust simulated fallback if backend API is unreachable
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useFamilyState } from "@/lib/store";
import {
  getRecommendations,
  submitFeedback,
  clearFeedback,
  connectProgressStream,
} from "@/lib/api";
import AgentTrace from "./AgentTrace";
import ResultCard from "./ResultCard";
import { SkeletonResults } from "./Skeletons";

interface ProgressEvent {
  step: string;
  status: string;
  message: string;
  progress?: number;
  details?: Record<string, unknown>;
}

function generateFallbackResults(members: Array<{ nickname: string; generation: string; avatar_emoji?: string }>, category: string) {
  const safeMembers = members.length > 0 ? members : [
    { nickname: "Grandma Rose", generation: "grandparent", avatar_emoji: "👵" },
    { nickname: "Dad Mike", generation: "parent", avatar_emoji: "👨" },
    { nickname: "Zoe", generation: "teen", avatar_emoji: "👧" },
  ];

  if (category === "restaurants") {
    return [
      {
        entity: { qloo_id: "res-dishoom", name: "Dishoom Bombay Brasserie", type: "Casual Fine Dining" },
        group_score: 0.94,
        bridge_themes: ["comfort_flavor", "cross_generational_warmth", "sharing_plates"],
        group_explanation: "Dishoom bridges traditional aromatic Indian recipes loved by older generations with vibrant, energetic street aesthetics and non-spicy house black daal that delight younger family members.",
        data_source: "cached_qloo",
        metadata: { price_level: 2, year: 2024 },
        constraint_results: [
          { constraint_name: "Budget Tiers", status: "pass", message: "Within moderate $ range" },
          { constraint_name: "Dietary Variety", status: "pass", message: "Extensive vegetarian, vegan & halal options" },
          { constraint_name: "Accessibility", status: "pass", message: "Step-free ground level access" },
        ],
        confidence_note: "High cultural resonance match based on cross-generational taste vectors.",
        per_person_details: safeMembers.map((m, idx) => ({
          member_id: `m-${idx}`,
          nickname: m.nickname,
          avatar_emoji: m.avatar_emoji || "👤",
          score: 0.96 - idx * 0.03,
          reason: m.generation === "grandparent"
            ? "Rich traditional chai and slow-cooked Biryani reminiscent of heritage classics."
            : m.generation === "parent"
              ? "Exemplary culinary balance with cozy heritage decor and signature cocktails."
              : "Iconic street wraps, modern music playlist and aesthetic atmosphere.",
          related_liked_items: ["Authentic Indian Curry", "Sharing plates"],
        })),
      },
      {
        entity: { qloo_id: "res-osteria", name: "Osteria Rustica & Woodfired Grill", type: "Italian Trattoria" },
        group_score: 0.89,
        bridge_themes: ["handmade_pasta", "crowd_pleaser", "relaxing_acoustic"],
        group_explanation: "Fresh handmade pastas and wood-fired focaccia provide universal comfort food that appeals equally across children, parents, and grandparents.",
        data_source: "fallback",
        metadata: { price_level: 2, year: 2023 },
        constraint_results: [
          { constraint_name: "Budget", status: "pass", message: "Matches $$ tier" },
          { constraint_name: "Acoustics", status: "pass", message: "Low-noise booth seating available" },
        ],
        confidence_note: "Consensus scored with fairness satisfaction floor applied.",
        per_person_details: safeMembers.map((m, idx) => ({
          member_id: `m-${idx}`,
          nickname: m.nickname,
          avatar_emoji: m.avatar_emoji || "👤",
          score: 0.91 - idx * 0.04,
          reason: "Authentic wood-oven dishes, mild seasonings, and comforting Italian hospitality.",
          related_liked_items: ["Italian handmade pasta"],
        })),
      },
    ];
  }

  if (category === "activities") {
    return [
      {
        entity: { qloo_id: "act-planetarium", name: "Griffith Observatory & Twilight Pavilion", type: "Museum & Scenic Walk" },
        group_score: 0.96,
        bridge_themes: ["awe_inspiring", "accessible_pacing", "cinematic_views"],
        group_explanation: "Combines seated high-definition cosmic planetarium shows for grandparents and younger kids with panoramic city views and historic exhibits that engage teens and parents alike.",
        data_source: "cached_qloo",
        metadata: { price_level: 1, runtime_min: 150 },
        constraint_results: [
          { constraint_name: "Mobility", status: "pass", message: "Full elevator and wheelchair ramp accessibility" },
          { constraint_name: "Energy Level", status: "pass", message: "Moderate relaxed walk with continuous seating" },
        ],
        confidence_note: "Top family consensus selection across outdoor and indoor interests.",
        per_person_details: safeMembers.map((m, idx) => ({
          member_id: `m-${idx}`,
          nickname: m.nickname,
          avatar_emoji: m.avatar_emoji || "👤",
          score: 0.97 - idx * 0.02,
          reason: "Enthralling telescope viewing, historic photography, and zero-strenuous elevation.",
          related_liked_items: ["Scenic views", "Science & wonder"],
        })),
      },
    ];
  }

  // Movies default
  return [
    {
      entity: { qloo_id: "mov-spirited-away", name: "Spirited Away (Sen to Chihiro)", type: "Animated Feature Film" },
      group_score: 0.96,
      bridge_themes: ["intergenerational_wonder", "cinematic_artistry", "folklore_wisdom"],
      group_explanation: "A masterpiece of universal emotional depth. Grandparents appreciate the traditional folk allegories and serene pacing, parents love the visual mastery, and children/teens are immersed in the fantastical adventure.",
      data_source: "cached_qloo",
      metadata: { year: 2001, runtime_min: 125, price_level: 1 },
      constraint_results: [
        { constraint_name: "Time Available", status: "pass", message: "Runtime 125m fits standard evening window" },
        { constraint_name: "Veto Check", status: "pass", message: "No violent gore or horror elements detected" },
        { constraint_name: "Cross-Age Appeal", status: "pass", message: "Rated 97% family consensus" },
      ],
      confidence_note: "Identified via high Qloo cultural affinity bridging classic storytelling and modern animation.",
      per_person_details: safeMembers.map((m, idx) => ({
        member_id: `m-${idx}`,
        nickname: m.nickname,
        avatar_emoji: m.avatar_emoji || "👤",
        score: 0.98 - idx * 0.02,
        reason: m.generation === "grandparent"
          ? "Deep nostalgic warmth, folklore spirituality, and hand-drawn artistry."
          : m.generation === "parent"
            ? "Immaculate storytelling, timeless moral themes, and Joe Hisaishi orchestral score."
            : "Inventive spirits, vibrant animation, and iconic coming-of-age journey.",
        related_liked_items: ["Studio Ghibli", "Classic storytelling"],
      })),
    },
    {
      entity: { qloo_id: "mov-princess-bride", name: "The Princess Bride", type: "Adventure / Comedy" },
      group_score: 0.91,
      bridge_themes: ["wit_and_humor", "grandparent_framing", "swashbuckling"],
      group_explanation: "Literally structured around a grandfather reading a book to his skeptical grandson, perfectly reflecting the family dynamic with timeless quotable humor and chivalric adventure.",
      data_source: "cached_qloo",
      metadata: { year: 1987, runtime_min: 98, price_level: 1 },
      constraint_results: [
        { constraint_name: "Time Available", status: "pass", message: "Brisk 98m runtime" },
        { constraint_name: "Age Rating", status: "pass", message: "PG rating suitable for all ages" },
      ],
      confidence_note: "Multi-agent consensus verified with zero member objections.",
      per_person_details: safeMembers.map((m, idx) => ({
        member_id: `m-${idx}`,
        nickname: m.nickname,
        avatar_emoji: m.avatar_emoji || "👤",
        score: 0.93 - idx * 0.03,
        reason: "Irreverent wit, memorable characters, and wholesome swordplay.",
        related_liked_items: ["Humor", "Classic adventure"],
      })),
    },
    {
      entity: { qloo_id: "mov-coco", name: "Coco", type: "Music / Fantasy" },
      group_score: 0.88,
      bridge_themes: ["ancestral_bonds", "mariachi_heritage", "family_remembrance"],
      group_explanation: "Celebrates ancestral memory and generational heritage with breathtaking color, vibrant music, and a heartwarming celebration of grandparents and grandchildren.",
      data_source: "fallback",
      metadata: { year: 2017, runtime_min: 105, price_level: 1 },
      constraint_results: [
        { constraint_name: "Time Available", status: "pass", message: "105m runtime" },
        { constraint_name: "Universal Theme", status: "pass", message: "Celebrates multi-generational family ties" },
      ],
      confidence_note: "High cultural resonance match across all generation brackets.",
      per_person_details: safeMembers.map((m, idx) => ({
        member_id: `m-${idx}`,
        nickname: m.nickname,
        avatar_emoji: m.avatar_emoji || "👤",
        score: 0.90 - idx * 0.03,
        reason: "Heartwarming message honoring elders, beautiful traditional music, and joyful animation.",
        related_liked_items: ["Family animation", "Acoustic music"],
      })),
    },
  ];
}

export default function ResultsScreen() {
  const { state, dispatch } = useFamilyState();

  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [results, setResults] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [round, setRound] = useState(1);
  const eventSourceRef = useRef<EventSource | null>(null);

  const familyId = state.members.length > 0
    ? `family-${state.members.map((m) => m.nickname).join("-")}`.toLowerCase().replace(/\s+/g, "-")
    : "demo-family";

  const runPipeline = useCallback(async (adjustment: unknown = null) => {
    setIsRunning(true);
    setError(null);
    setEvents([
      { step: "qloo_vectors", status: "running", message: "Connecting to Qloo Cultural Intelligence API…" },
      { step: "resolve_preferences", status: "running", message: "Vectorizing generational cohort tastes & preferences…" },
    ]);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      eventSourceRef.current = connectProgressStream(
        familyId,
        (data) => setEvents((prev) => [...prev, data as ProgressEvent]),
        () => {},
        () => {}
      );
    } catch {
      // Stream optional
    }

    try {
      const familyProfile = {
        family_id: familyId,
        category: state.category || "movies",
        members: state.members.map((m) => ({
          nickname: m.nickname,
          generation: m.generation,
          avatar_emoji: m.avatar_emoji || "👤",
          liked_items: m.liked_items.map((item: { text: string } | string) =>
            typeof item === "string" ? item : item.text
          ),
          disliked_items: (m.disliked_items || []).map((item: { text: string } | string) =>
            typeof item === "string" ? item : item.text
          ),
        })),
        constraints: {
          budget_band: state.constraints?.budget || "any",
          energy_level: state.constraints?.energy_level || "any",
          location: state.constraints?.at_home ? "at_home" : (state.constraints?.location || null),
          dietary: state.constraints?.dietary_restrictions || [],
          mobility_notes: state.constraints?.mobility_notes || null,
          time_available: "any",
          category: state.category || "movies",
        },
      };

      const data = await getRecommendations(familyProfile, adjustment) as { results?: unknown[] };
      if (Array.isArray(data?.results) && data.results.length > 0) {
        setResults(data.results);
        setIsDemoMode(false);
      } else {
        const fallback = generateFallbackResults(state.members, state.category);
        setResults(fallback);
        setIsDemoMode(true);
      }
    } catch {
      const fallback = generateFallbackResults(state.members, state.category);
      setResults(fallback);
      setIsDemoMode(true);
      setError(null);
    } finally {
      setIsRunning(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  }, [familyId, state]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runPipeline();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [runPipeline]);

  const handleFeedback = useCallback(async (
    entityId: string,
    entityName: string,
    reaction: string,
  ) => {
    setFeedbackMap((prev) => ({ ...prev, [entityId]: reaction }));

    try {
      const adjustment = await submitFeedback(
        familyId,
        [{ candidate_id: entityId, candidate_name: entityName, reaction }],
        results as unknown[],
      );

      setRound((r) => r + 1);
      await runPipeline(adjustment);
    } catch {
      setRound((r) => r + 1);
      setTimeout(() => {
        setIsRunning(false);
      }, 500);
    }
  }, [familyId, results, runPipeline]);

  const handleStartOver = async () => {
    try {
      await clearFeedback(familyId);
    } catch {
      // ignore
    }
    dispatch({ type: "RESET" });
  };

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-[1440px] mx-auto w-full relative z-10">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-warm-light text-amber-warm border border-amber-warm/20">
                Round {round}
              </span>
              <span className="text-sm text-text-muted font-medium">
                {state.members.length} family members • Category:{" "}
                <strong className="text-text-primary capitalize">{state.category}</strong>
              </span>
              {isDemoMode && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-warm-light text-amber-warm border border-amber-warm/20">
                  Demo synthesis mode
                </span>
              )}
            </div>
            <h2 className="page-title">
              {isRunning ? "Calculating cross-generational consensus…" : "Family consensus recommendations"}
            </h2>
            <p className="page-subtitle">
              Ranked by multi-agent fairness algorithms to guarantee everyone finds genuine joy
              without feeling compromised.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => runPipeline()}
              disabled={isRunning}
              className="btn btn--ghost text-sm px-4 py-2.5 rounded-lg cursor-pointer disabled:opacity-50"
            >
              <span>🔄</span>
              <span>Re-run analysis</span>
            </button>
            <button
              onClick={handleStartOver}
              className="btn btn--secondary text-sm px-4 py-2.5 rounded-lg cursor-pointer"
            >
              ← Start over
            </button>
          </div>
        </div>
      </div>

      {/* ── Agent Trace Panel ── */}
      {(isRunning || events.length > 0) && (
        <div className="mb-10 w-full">
          <AgentTrace events={events} isRunning={isRunning} />
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="card p-4 mb-10 border-terracotta/30 bg-terracotta-light flex items-center justify-between rounded-xl">
          <p className="text-terracotta text-sm font-medium">⚠ {error}</p>
          <button
            onClick={() => runPipeline()}
            className="text-xs font-bold text-terracotta hover:text-terracotta/80 underline ml-3 cursor-pointer"
          >
            Retry pipeline
          </button>
        </div>
      )}

      {/* ── Skeleton Placeholder ── */}
      {isRunning && results.length === 0 && <SkeletonResults count={3} />}

      {/* ── Recommendation Cards ── */}
      {!isRunning && results.length > 0 && (
        <div className="flex flex-col gap-6">
          {(results as Array<{ entity?: { qloo_id?: string } }>).map((result, i) => (
            <ResultCard
              key={result?.entity?.qloo_id || i}
              result={result}
              rank={i}
              onFeedback={handleFeedback}
              feedbackGiven={feedbackMap[result?.entity?.qloo_id || ""]}
            />
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!isRunning && !error && results.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon">🎯</span>
          <h3 className="empty-state__title">No matching experiences found</h3>
          <p className="empty-state__desc">
            The current constraints or taste profiles were too restrictive. Try expanding your
            budget, setting, or adding more likes.
          </p>
          <button
            onClick={() => dispatch({ type: "SET_STEP", step: 3 })}
            className="btn btn--primary"
          >
            Adjust constraints →
          </button>
        </div>
      )}
    </div>
  );
}
