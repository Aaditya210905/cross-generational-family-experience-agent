/**
 * FusionAI — Agent Trace Panel
 * 
 * Live pipeline progress visualization consuming SSE events.
 * Shows each step with status icons, messages, and a progress bar.
 */
'use client';

import { useState, useEffect, useRef } from 'react';

const PIPELINE_STEPS = [
  { key: 'resolve', label: 'Resolving Preferences', icon: '🔍' },
  { key: 'retrieve', label: 'Querying Taste Profiles', icon: '📊' },
  { key: 'adjust', label: 'Applying Feedback', icon: '🔄' },
  { key: 'rank', label: 'Scoring Candidates', icon: '⚖️' },
  { key: 'constrain', label: 'Applying Constraints', icon: '🛡️' },
  { key: 'explain', label: 'Generating Explanations', icon: '💡' },
];

export default function AgentTrace({ events, isRunning }) {
  const [expandedSteps, setExpandedSteps] = useState(new Set());
  const containerRef = useRef(null);

  // Build step status map from events
  const stepStatus = {};
  let latestProgress = 0;
  let currentStep = null;

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
    if (event.status === 'started' || event.status === 'in_progress') {
      currentStep = key;
    }
  });

  const getStepState = (stepKey) => {
    const s = stepStatus[stepKey];
    if (!s) return 'pending';
    if (s.status === 'completed') return 'completed';
    if (s.status === 'error') return 'error';
    if (s.status === 'started' || s.status === 'in_progress') return 'active';
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
    <div className="trace-panel" ref={containerRef}>
      <div className="trace-header">
        <h3>
          <span>🤖</span>
          <span>Agent Pipeline</span>
        </h3>
        {isRunning && (
          <span className="badge badge--source" style={{ animation: 'pulse-glow 2s infinite' }}>
            Processing...
          </span>
        )}
        {!isRunning && events.length > 0 && (
          <span className="badge badge--pass">Complete</span>
        )}
      </div>

      <div className="trace-progress">
        <div
          className="trace-progress__fill"
          style={{ width: `${latestProgress * 100}%` }}
        />
      </div>

      <div className="trace-steps">
        {PIPELINE_STEPS.map((step) => {
          const state = getStepState(step.key);
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
                <div className="trace-step__title">
                  {step.icon} {step.label}
                </div>
                {info?.message && (
                  <div className="trace-step__message">
                    {info.message}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
