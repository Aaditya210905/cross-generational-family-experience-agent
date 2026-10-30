/**
 * FamilyFusion AI — Main Page
 *
 * Futuristic step-based wizard with permanent glassmorphic navbar,
 * quick tab switcher, and status badges.
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
    <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
      {/* ── Modern Wide Navigation Bar ────────────────────────────── */}
      <header className="w-full border-b border-violet-500/20 bg-[#050510]/85 backdrop-blur-2xl sticky top-0 z-50 shadow-[0_4px_40px_rgba(139,92,246,0.12)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          {/* Logo & Branding */}
          <button
            onClick={() => dispatch({ type: "SET_STEP", step: 0 })}
            className="flex items-center gap-3 group cursor-pointer text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-600 flex items-center justify-center text-xl shadow-[0_0_24px_rgba(139,92,246,0.5)] group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
              ✨
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight flex items-center gap-2">
                <span className="text-white">FamilyFusion</span>
                <span className="text-gradient">AI</span>
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border border-violet-400/40 ml-1">
                  Cultural Taste AI
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Qloo Cultural Intelligence • Cross-Generational Harmony
              </p>
            </div>
          </button>

          {/* Center: System Status Pill */}
          <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-400/30 text-xs sm:text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-emerald-300 font-semibold">Qloo Engine Connected</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-300 font-semibold">Fairness Multi-Agent Active</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {state.members.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 border border-violet-400/30 text-violet-300 text-xs sm:text-sm font-semibold shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <span>👨‍👩‍👧‍👦</span>
                <span>{state.members.length} Members</span>
              </span>
            )}
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-violet-400/50 transition-all cursor-pointer"
              title="Reset entire wizard"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </header>

      {/* ── Wizard Step Navigation ──────────────────────────────────── */}
      <StepProgress />

      {/* ── Active Wizard View ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-start">
        {screens[state.currentStep]}
      </div>
    </main>
  );
}
