/**
 * FusionAI — Main Page Shell
 *
 * Clean, warm editorial layout hosting the family recommendation wizard.
 * Preserves all existing wizard steps and state management.
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
    <main className="page-shell flex-1 flex flex-col relative overflow-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border-base bg-white/80 backdrop-blur-md">
        <div className="page-container">
          <div className="flex items-center justify-between py-3.5">
            <button
              onClick={() => dispatch({ type: "SET_STEP", step: 0 })}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-warm flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                ✨
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-display font-bold text-lg tracking-tight text-text-primary">
                  Fusion<span className="text-amber-warm">AI</span>
                </span>
                <span className="text-xs text-text-muted">
                  Cross-Generational Experiences
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2">
              {state.members.length > 0 && (
                <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-base bg-white text-text-secondary text-sm font-medium">
                  <span className="text-sm">👨‍👩‍👧‍👦</span>
                  <span>{state.members.length} members</span>
                </span>
              )}
              <button
                onClick={() => dispatch({ type: "RESET" })}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-base bg-white text-text-secondary text-sm font-medium hover:bg-cream-100 hover:text-text-primary transition-colors"
                title="Reset wizard"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Step Progress ── */}
      <StepProgress />

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col">
        <div className="page-container pb-10 pt-2">
          {screens[state.currentStep]}
        </div>
      </div>
    </main>
  );
}
