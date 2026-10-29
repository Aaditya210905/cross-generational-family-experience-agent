/**
 * FamilyFusion AI — Futuristic Step Progress & Navigation
 *
 * Clickable tab wizard navigation with neon glow, glassmorphism,
 * and clear active states. Allows jumping directly across tabs.
 */

"use client";

import { useFamilyState } from "@/lib/store";

const STEPS = [
  { step: 0, label: "Welcome", icon: "👋", desc: "Overview" },
  { step: 1, label: "Family", icon: "👨‍👩‍👧‍👦", desc: "Add Members" },
  { step: 2, label: "Preferences", icon: "❤️", desc: "Likes & Dislikes" },
  { step: 3, label: "Constraints", icon: "⚙️", desc: "Limits & Budget" },
  { step: 4, label: "Results", icon: "✨", desc: "AI Recommendations" },
];

export default function StepProgress() {
  const { state, dispatch } = useFamilyState();
  const { currentStep } = state;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-6 pb-2">
      {/* Container with frosted glass bar */}
      <div className="relative bg-[rgba(16,20,36,0.65)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl p-2 sm:p-3 shadow-xl">
        {/* Subtle connecting progress bar (behind indicators) */}
        <div className="hidden sm:block absolute top-1/2 left-8 right-8 h-0.5 -translate-y-1/2 bg-[rgba(255,255,255,0.06)] z-0">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps Flex List */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2 relative z-10">
          {STEPS.map((step) => {
            const isCompleted = step.step < currentStep;
            const isActive = step.step === currentStep;

            return (
              <button
                key={step.label}
                onClick={() => dispatch({ type: "SET_STEP", step: step.step })}
                className={`flex flex-col items-center py-2 px-1 sm:px-2 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? "bg-gradient-to-b from-indigo-500/20 to-purple-500/10 border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                    : isCompleted
                      ? "hover:bg-white/[0.04] border border-emerald-500/20"
                      : "hover:bg-white/[0.03] border border-transparent opacity-75 hover:opacity-100"
                }`}
                title={`Jump to ${step.label}`}
              >
                {/* Circular indicator */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg transition-all duration-300 relative ${
                    isActive
                      ? "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.8)] scale-110"
                      : isCompleted
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                        : "bg-white/[0.05] border border-white/10 text-white/50 group-hover:border-white/25 group-hover:text-white/80"
                  }`}
                >
                  {isCompleted ? "✓" : step.icon}

                  {/* Active ping ring */}
                  {isActive && (
                    <span className="absolute -inset-1 rounded-full border border-indigo-400/50 animate-ping opacity-40 pointer-events-none" />
                  )}
                </div>

                {/* Step labels */}
                <div className="text-center mt-1.5 w-full">
                  <span
                    className={`block text-[11px] sm:text-xs font-bold tracking-tight truncate ${
                      isActive
                        ? "text-indigo-300"
                        : isCompleted
                          ? "text-emerald-400/90"
                          : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="hidden md:block text-[9px] text-slate-500 truncate font-mono">
                    {step.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
