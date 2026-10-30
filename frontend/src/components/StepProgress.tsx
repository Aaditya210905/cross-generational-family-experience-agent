/**
 * FusionAI — Step Progress Indicator
 *
 * Clean, minimal wizard step navigation. Clickable steps allow jumping.
 */

"use client";

import { useFamilyState } from "@/lib/store";

const STEPS = [
  { step: 0, label: "Welcome", icon: "👋", desc: "Overview & demo" },
  { step: 1, label: "Family", icon: "👨‍👩‍👧‍👦", desc: "Add members" },
  { step: 2, label: "Preferences", icon: "❤️", desc: "Taste signals" },
  { step: 3, label: "Constraints", icon: "⚙️", desc: "Boundaries" },
  { step: 4, label: "Results", icon: "✨", desc: "Recommendations" },
];

export default function StepProgress() {
  const { state, dispatch } = useFamilyState();
  const { currentStep } = state;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-2">
      <div className="relative bg-white border border-border-base rounded-xl p-2.5 shadow-soft">
        {/* Connecting line */}
        <div className="hidden md:block absolute top-1/2 left-6 right-6 h-1 -translate-y-1/2 bg-border-base rounded-full z-0">
          <div
            className="h-full bg-amber-warm transition-all duration-500 rounded-full"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="grid grid-cols-5 gap-1 relative z-10">
          {STEPS.map((step) => {
            const isCompleted = step.step < currentStep;
            const isActive = step.step === currentStep;

            return (
              <button
                key={step.label}
                onClick={() => dispatch({ type: "SET_STEP", step: step.step })}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg transition-all duration-300 group cursor-pointer ${
                  isActive
                    ? "bg-amber-warm-light border border-amber-warm/20"
                    : isCompleted
                      ? "bg-sage-light border border-sage/20"
                      : "bg-transparent border-transparent"
                }`}
                title={`Jump to ${step.label} (${step.desc})`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all duration-300 ${
                  isActive
                    ? "bg-amber-warm text-white font-bold shadow-sm"
                    : isCompleted
                      ? "bg-sage text-white font-bold"
                      : "bg-cream-100 border border-border-base text-text-muted"
                }`}
                >
                  {isCompleted ? "✓" : step.icon}
                </div>

                <span
                  className={`text-[10px] font-bold tracking-wider uppercase truncate w-9 text-center leading-none ${
                    isActive
                      ? "text-amber-warm"
                      : isCompleted
                        ? "text-sage"
                        : "text-text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
