/**
 * FamilyFusion AI — Step Progress Bar
 *
 * Visual indicator showing the user's progress through the wizard.
 */

"use client";

import { useFamilyState } from "@/lib/store";

const STEPS = [
  { label: "Welcome", icon: "👋" },
  { label: "Family", icon: "👨‍👩‍👧‍👦" },
  { label: "Preferences", icon: "❤️" },
  { label: "Constraints", icon: "⚙️" },
  { label: "Results", icon: "✨" },
];

export default function StepProgress() {
  const { state } = useFamilyState();
  const { currentStep } = state;

  // Don't show on welcome screen
  if (currentStep === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-[var(--ff-border)]" />
        {/* Progress line */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-[var(--ff-primary)] transition-all duration-500"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isFuture = index > currentStep;

          return (
            <div
              key={step.label}
              className="flex flex-col items-center gap-2 relative z-10"
            >
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-lg
                  step-indicator transition-all duration-300
                  ${isCompleted ? "completed bg-green-500" : ""}
                  ${isActive ? "active" : ""}
                  ${isFuture ? "bg-[var(--ff-surface)] border border-[var(--ff-border)]" : ""}
                `}
              >
                {isCompleted ? "✓" : step.icon}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? "text-[var(--ff-primary)]"
                    : isCompleted
                      ? "text-green-400"
                      : "text-[var(--ff-text-muted)]"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

