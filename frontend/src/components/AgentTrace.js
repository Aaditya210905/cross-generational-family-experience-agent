/**
 * FusionAI — Agent Trace Panel
 *
 * Clean multi-agent pipeline visualization showing SSE streaming events,
 * current reasoning step, and progress bar.
 */

'use client';

import { useState } from 'react';

const PIPELINE_STEPS = [
  { key: 'resolve', label: 'Resolving preferences', icon: '🔍', desc: 'Mapping raw text to Qloo cultural entities' },
  { key: 'retrieve', label: 'Querying taste profiles', icon: '📊', desc: 'Fetching cross-domain affinity candidates' },
  { key: 'adjust', label: 'Applying feedback', icon: '🔄', desc: 'Filtering exclusions & tuning diversity weights' },
  { key: 'rank', label: 'Fairness-optimized scoring', icon: '⚖️', desc: 'Balancing generational consensus & Pareto efficiency' },
  { key: 'constrain', label: 'Verifying constraints', icon: '🛡️', desc: 'Filtering for budget, energy, dietary & mobility' },
  { key: 'explain', label: 'Grounded explanations', icon: '💡', desc: 'Generating human-readable generational bridge rationale' },
];

export default function AgentTrace({ events, isRunning }) {
  const [collapsed, setCollapsed] = useState(false);

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
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="font-display font-bold text-base text-text-primary">
                Autonomous agent consensus pipeline
              </h3>
              <p className="text-xs text-text-muted font-mono">
                Live Qloo cultural vectors & fairness multi-agent trace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="badge badge--source flex items-center gap-2 animate-pulse text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-warm" />
                <span>Synthesizing…</span>
              </span>
            )}
            {!isRunning && events.length > 0 && (
              <span className="badge badge--pass text-xs font-semibold">Consensus verified</span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-xs font-bold text-text-muted hover:text-text-primary px-3 py-1.5 rounded-md bg-cream-100 border border-border-base cursor-pointer transition-colors"
            >
              {collapsed ? 'Expand log' : 'Collapse log'}
            </button>
          </div>
        </div>

        <div className="trace-progress mb-4">
          <div
            className="trace-progress__fill"
            style={{ width: `${isRunning ? Math.max(15, latestProgress * 100) : 100}%` }}
          />
        </div>

        {!collapsed && (
          <div className="trace-steps space-y-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const state = getStepState(step.key, idx);
              const info = stepStatus[step.key];

              const statusColors = {
                completed: 'text-sage bg-sage-light border-sage/20',
                active: 'text-amber-warm bg-amber-warm-light border-amber-warm/20',
                error: 'text-terracotta bg-terracotta-light border-terracotta/20',
                pending: 'text-text-muted bg-cream-50 border-border-base',
              };

              return (
                <div
                  key={step.key}
                  className={`trace-step flex items-center gap-3 p-2.5 rounded-md border transition-all duration-200 ${
                    statusColors[state]
                  }`}
                >
                  <div className="trace-step__icon flex items-center justify-center w-6 h-6 rounded-full bg-white text-xs font-bold text-text-primary shadow-sm">
                    {getStatusIcon(state)}
                  </div>
                  <div className="trace-step__content flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="trace-step__title flex items-center gap-1.5 text-sm font-medium text-text-primary">
                        <span>{step.icon}</span>
                        <span>{step.label}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">
                        {state}
                      </span>
                    </div>
                    <p className="trace-step__message text-xs text-text-secondary mt-0.5 leading-relaxed">
                      {info?.message || step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
