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
      <div className="trace-header">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="font-extrabold text-sm text-white">
              Autonomous Agent Pipeline
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Live Qloo &amp; LLM Orchestrator Trace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="badge badge--source flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>Synthesizing...</span>
            </span>
          )}
          {!isRunning && events.length > 0 && (
            <span className="badge badge--pass">Consensus Verified</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/[0.04] border border-white/10 cursor-pointer ml-1"
          >
            {collapsed ? 'Expand Log' : 'Collapse'}
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
        <div className="trace-steps">
          {PIPELINE_STEPS.map((step, idx) => {
            const state = getStepState(step.key, idx);
            const info = stepStatus[step.key];

            return (
              <div
                key={step.key}
                className={`trace-step trace-step--${state}`}
              >
                <div className="trace-step__icon">
                  {getStatusIcon(state)}
                </div>
                <div className="trace-step__content">
                  <div className="flex items-center justify-between">
                    <span className="trace-step__title flex items-center gap-1.5 font-bold">
                      <span>{step.icon}</span>
                      <span>{step.label}</span>
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                      {state}
                    </span>
                  </div>
                  <p className="trace-step__message">
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
