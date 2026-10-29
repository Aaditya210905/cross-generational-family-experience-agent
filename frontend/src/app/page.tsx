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
      {/* ── Futuristic Top Navigation Bar ────────────────────────────── */}
      <header className="w-full border-b border-white/[0.08] bg-[#07080e]/80 backdrop-blur-2xl sticky top-0 z-50 transition-all">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Branding */}
          <button
            onClick={() => dispatch({ type: "SET_STEP", step: 0 })}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-lg shadow-[0_0_16px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform">
              ✨
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight flex items-center gap-1">
                <span className="text-white">FamilyFusion</span>
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 ml-1">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Qloo Cultural Intelligence Engine
              </p>
            </div>
          </button>

          {/* Center: System Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-slate-300 font-medium">Qloo Insights Online</span>
            <span className="text-slate-600">•</span>
            <span className="text-indigo-400 font-medium">Fairness Engine Active</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {state.members.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <span>👨‍👩‍👧‍👦</span>
                <span>{state.members.length} Members</span>
              </span>
            )}
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
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
