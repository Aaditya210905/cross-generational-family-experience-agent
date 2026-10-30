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
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
      {/* Container with frosted glass bar */}
      <div className="relative bg-[rgba(16,20,36,0.75)] backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 sm:p-3.5 shadow-2xl">
        {/* Connecting progress bar (behind indicators) */}
        <div className="hidden md:block absolute top-1/2 left-12 right-12 h-1 -translate-y-1/2 bg-white/[0.06] rounded-full z-0">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 transition-all duration-500 rounded-full shadow-[0_0_16px_rgba(168,85,247,0.8)]"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 relative z-10">
          {STEPS.map((step) => {
            const isCompleted = step.step < currentStep;
            const isActive = step.step === currentStep;

            return (
              <button
                key={step.label}
                onClick={() => dispatch({ type: "SET_STEP", step: step.step })}
                className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2.5 sm:gap-3.5 py-2.5 px-2 sm:px-4 rounded-xl transition-all duration-300 group cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600/30 to-fuchsia-600/20 border border-violet-400/60 shadow-[0_0_24px_rgba(139,92,246,0.3)]"
                    : isCompleted
                      ? "hover:bg-white/[0.05] border border-emerald-500/30 bg-emerald-500/[0.04]"
                      : "hover:bg-white/[0.04] border border-transparent opacity-80 hover:opacity-100"
                }`}
                title={`Jump to ${step.label} (${step.desc})`}
              >
                {/* Circular indicator */}
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl transition-all duration-300 relative flex-shrink-0 ${
                    isActive
                      ? "bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.8)] scale-105"
                      : isCompleted
                        ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold"
                        : "bg-white/[0.06] border border-white/10 text-white/60 group-hover:border-white/25 group-hover:text-white"
                  }`}
                >
                  {isCompleted ? "✓" : step.icon}

                  {/* Active ping ring */}
                  {isActive && (
                    <span className="absolute -inset-1 rounded-xl border border-violet-400/50 animate-ping opacity-35 pointer-events-none" />
                  )}
                </div>

                {/* Step labels */}
                <div className="text-center sm:text-left min-w-0">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <span className="text-[11px] font-mono font-bold text-slate-500 sm:inline hidden">
                      0{step.step + 1}.
                    </span>
                    <span
                      className={`block text-xs sm:text-sm font-bold tracking-tight truncate ${
                        isActive
                          ? "text-white"
                          : isCompleted
                            ? "text-emerald-300"
                            : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  <span className="hidden lg:block text-xs text-slate-400 truncate mt-0.5 font-medium">
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
