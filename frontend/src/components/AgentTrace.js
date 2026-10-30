/**
 * FusionAI — Agent Trace Panel
 * 
 * Live multi-agent pipeline visualization showing SSE streaming events,
 * current reasoning step, and progress bar.
 */
'use client';

import { useState } from 'react';

const PIPELINE_STEPS = [
  { key: 'resolve', label: 'Resolving Preferences', icon: '🔍', desc: 'Mapping raw text to Qloo cultural entities' },
  { key: 'retrieve', label: 'Querying Taste Profiles', icon: '📊', desc: 'Fetching cross-domain affinity candidates' },
  { key: 'adjust', label: 'Applying Feedback', icon: '🔄', desc: 'Filtering exclusions & tuning diversity weights' },
  { key: 'rank', label: 'Fairness-Optimized Scoring', icon: '⚖️', desc: 'Balancing generational consensus & Pareto efficiency' },
  { key: 'constrain', label: 'Verifying Constraints', icon: '🛡️', desc: 'Filtering for budget, energy, dietary & mobility' },
  { key: 'explain', label: 'Grounded LLM Explanations', icon: '💡', desc: 'Generating human-readable generational bridge rationale' },
];

export default function AgentTrace({ events, isRunning }) {
  const [collapsed, setCollapsed] = useState(false);

  // Build step status map from events
  const stepStatus = {};
  let latestProgress = 0;

  events.forEach((event) => {
    const key = event.step;
    if (key === 'pipeline') {
      latestProgress = event.progress || 0;
      return;
    }
    stepStatus[key] = {
      status: event.status,
      message: event.message,
      details: event.details,
      progress: event.progress,
    };
  });

  const getStepState = (stepKey, index) => {
    const s = stepStatus[stepKey];
    if (s?.status === 'completed') return 'completed';
    if (s?.status === 'error') return 'error';
    if (s?.status === 'started' || s?.status === 'in_progress') return 'active';
    
    // If running and no events yet, highlight initial steps
    if (isRunning && events.length === 0 && index === 0) return 'active';
    return 'pending';
  };

  const getStatusIcon = (state) => {
    switch (state) {
      case 'completed': return '✓';
      case 'active': return '⟳';
      case 'error': return '✗';
      default: return '○';
    }
  };

  return (
    <div className="trace-panel">
      {/* Header */}
      <div className="trace-header p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-extrabold text-base text-white">
              Autonomous Agent Consensus Pipeline
            </h3>
            <p className="text-xs text-slate-300 font-mono">
              Live Qloo Cultural Vectors &amp; Fairness Multi-Agent Trace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isRunning && (
            <span className="badge badge--source flex items-center gap-2 animate-pulse text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <span>Synthesizing...</span>
            </span>
          )}
          {!isRunning && events.length > 0 && (
            <span className="badge badge--pass text-xs font-semibold">Consensus Verified</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs sm:text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 cursor-pointer ml-1 transition-all"
          >
            {collapsed ? 'Expand Log' : 'Collapse Log'}
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="trace-progress">
        <div
          className="trace-progress__fill"
          style={{ width: `${isRunning ? Math.max(15, latestProgress * 100) : 100}%` }}
        />
      </div>

      {/* Steps List */}
      {!collapsed && (
        <div className="trace-steps p-4 sm:p-6 space-y-3">
          {PIPELINE_STEPS.map((step, idx) => {
            const state = getStepState(step.key, idx);
            const info = stepStatus[step.key];

            return (
              <div
                key={step.key}
                className={`trace-step trace-step--${state}`}
              >
                <div className="trace-step__icon text-sm">
                  {getStatusIcon(state)}
                </div>
                <div className="trace-step__content">
                  <div className="flex items-center justify-between">
                    <span className="trace-step__title flex items-center gap-2 font-bold text-sm sm:text-base">
                      <span>{step.icon}</span>
                      <span>{step.label}</span>
                    </span>
                    <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                      {state}
                    </span>
                  </div>
                  <p className="trace-step__message text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {info?.message || step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
