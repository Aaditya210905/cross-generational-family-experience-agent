/**
 * FamilyFusion AI — Main Page
 *
 * Step-based wizard that renders the active screen.
 */

"use client";

import { useFamilyState } from "@/lib/store";
import StepProgress from "@/components/StepProgress";
import WelcomeScreen from "@/components/WelcomeScreen";
import MembersScreen from "@/components/MembersScreen";
import PreferencesScreen from "@/components/PreferencesScreen";
import ConstraintsScreen from "@/components/ConstraintsScreen";
import ResultsScreen from "@/components/ResultsScreen";

export default function Home() {
  const { state, dispatch } = useFamilyState();

  const screens = [
    <WelcomeScreen key="welcome" />,
    <MembersScreen key="members" />,
    <PreferencesScreen key="preferences" />,
    <ConstraintsScreen key="constraints" />,
    <ResultsScreen key="results" />,
  ];

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      {/* Header — only on wizard steps, not the welcome landing */}
      {state.currentStep > 0 && (
        <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-lg">🏠</span>
              <span className="font-bold text-sm tracking-tight">
                FamilyFusion
                <span className="text-indigo-400 ml-0.5">AI</span>
              </span>
            </button>
            {state.currentStep < 4 && (
              <div className="text-xs text-[var(--text-muted)]">
                Step {state.currentStep} of 4
              </div>
            )}
          </div>
        </header>
      )}

      {/* Step progress */}
      <StepProgress />

      {/* Active screen */}
      {screens[state.currentStep]}
    </main>
  );
}
