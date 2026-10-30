/**
 * FusionAI — Result Card Component
 *
 * Clean recommendation card with:
 * - Score ring + top-pick badge
 * - Consensus group explanation
 * - Per-person match bars with avatars
 * - Expandable reasoning breakdown
 * - Constraint status badges & confidence notes
 * - Interactive feedback actions
 */

'use client';

import { useState } from 'react';
import ScoreRing from './ScoreRing';
import MatchBar from './MatchBar';

const DATA_SOURCE_LABELS = {
  live_qloo: { emoji: '🟢', label: 'Live Qloo' },
  cached_qloo: { emoji: '🟡', label: 'Cached Qloo' },
  fallback: { emoji: '🟣', label: 'Synthesized' },
};

const CONSTRAINT_BADGE = {
  pass: 'badge--pass',
  warning: 'badge--warning',
  fail: 'badge--fail',
  unverified: 'badge--source',
};

const CONSTRAINT_ICON = {
  pass: '✓',
  warning: '⚠',
  fail: '✗',
  unverified: '?',
};

export default function ResultCard({
  result,
  rank,
  onFeedback,
  feedbackGiven,
}) {
  const [expanded, setExpanded] = useState(false);

  const {
    entity = {},
    group_score = 0,
    per_person_details = [],
    bridge_themes = [],
    group_explanation,
    constraint_results = [],
    confidence_note,
    data_source,
    metadata = {},
  } = result;

  const source = DATA_SOURCE_LABELS[data_source] || DATA_SOURCE_LABELS.fallback;
  const isTopPick = rank === 0;

  const visibleConstraints = constraint_results.filter(
    (c) => c.status !== 'pass' || constraint_results.length <= 4
  );

  return (
    <div
      className={`card card--raised ${isTopPick ? 'border-amber-warm/40 shadow-sm' : ''} overflow-hidden`}
      style={{ animationDelay: `${rank * 0.06}s` }}
      id={`result-${entity.qloo_id}`}
    >
      {/* Top banner for #1 pick */}
      {isTopPick && (
        <div className="absolute top-0 left-0 px-4 py-2 bg-amber-warm text-white text-[10px] font-black uppercase tracking-widest">
          👑 #1 Family consensus pick
        </div>
      )}

      <div className="card-body pt-5 sm:pt-6">
        {/* Top section: Score + Info */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-start">
          <div className="flex flex-col items-center gap-3 shrink-0">
            <ScoreRing score={group_score} size={72} strokeWidth={5} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Consensus score
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                Recommendation #{rank + 1}
              </span>
              <span className="w-px h-3 bg-border-base" />
              <span className="badge badge--source text-xs font-semibold">
                {source.emoji} {source.label}
              </span>
            </div>

            <h3 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-2 tracking-tight">
              {entity.name}
            </h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {entity.type && (
                <span className="badge badge--source text-xs capitalize">
                  {entity.type}
                </span>
              )}
              {metadata.year && (
                <span className="badge badge--source text-xs">📅 {metadata.year}</span>
              )}
              {metadata.runtime_min && (
                <span className="badge badge--source text-xs">⏱️ {metadata.runtime_min} mins</span>
              )}
              {metadata.price_level && (
                <span className="badge badge--source text-xs">
                  {'💲'.repeat(metadata.price_level)}
                </span>
              )}
              {bridge_themes.map((theme) => (
                <span key={theme} className="badge badge--bridge text-xs font-semibold">
                  🌉 {theme.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Group explanation */}
        {group_explanation && (
          <div className="mt-6 p-5 rounded-xl bg-amber-warm-light border border-amber-warm/20">
            <div className="flex items-start gap-3">
              <span className="text-lg text-amber-warm mt-0.5">✨</span>
              <span className="leading-relaxed text-sm sm:text-base font-medium text-text-primary">
                {group_explanation}
              </span>
            </div>
          </div>
        )}

        {/* Per-person match bars */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Cohort harmony breakdown
            </span>
            <span className="text-[10px] text-text-muted font-normal">Fairness-weighted individual affinity</span>
          </div>
          <div className="space-y-2">
            {per_person_details.map((person) => (
              <MatchBar
                key={person.member_id}
                nickname={person.nickname}
                emoji={person.avatar_emoji}
                score={person.score}
                isEstimated={person.reason?.includes('estimated')}
              />
            ))}
          </div>
        </div>

        {/* Expand/collapse per-person reasons */}
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 pt-4 border-t border-border-base text-left cursor-pointer transition-colors"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span className="text-xs font-bold text-amber-warm flex items-center gap-1 transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            {expanded ? '▲' : '▼'}
            <span className="ml-1">View individual member reasons</span>
          </span>
        </button>

        <div className={`mt-4 ${expanded ? 'block' : 'hidden'}`}>
          <div className="space-y-3">
            {per_person_details.map((person) => (
              <div key={person.member_id} className="p-3 rounded-lg border border-border-base bg-cream-50">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{person.avatar_emoji}</span>
                    <span className="font-bold text-sm text-text-primary">{person.nickname}</span>
                    <span className="badge badge--source text-xs font-bold ml-auto">
                      {Math.round(person.score * 100)}% match
                    </span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {person.reason}
                </p>
                {person.related_liked_items?.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {person.related_liked_items.map((item) => (
                      <span
                        key={item}
                        className="badge badge--bridge text-xs"
                      >
                        Linked: {item.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Constraint badges in expanded view */}
          {visibleConstraints.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border-base">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">
                Constraint verification
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleConstraints.map((c, i) => (
                  <span
                    key={i}
                    className={`badge ${CONSTRAINT_BADGE[c.status]} text-xs`}
                    title={c.message}
                  >
                    {CONSTRAINT_ICON[c.status]} {c.constraint_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confidence note */}
        {confidence_note && (
          <div className="mt-6 pt-4 border-t border-border-base">
            <span className="text-xs text-text-muted italic flex items-center gap-1">
              ℹ️ {confidence_note}
            </span>
          </div>
        )}
      </div>

      {/* Feedback actions */}
      <div className="border-t border-border-base card-body pb-5 sm:pt-0">
        <div className="flex flex-wrap gap-3">
          <button
            className={`btn ${feedbackGiven === 'like' ? 'btn--sage' : 'btn--secondary'} px-5 py-2.5 text-xs sm:text-sm font-bold rounded-lg cursor-pointer flex-1 sm:flex-auto justify-center`}
            onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'like')}
            disabled={!!feedbackGiven}
            title="We love this suggestion"
          >
            👍 We love this
          </button>
          <button
            className={`btn ${feedbackGiven === 'dislike' ? 'btn--danger' : 'btn--secondary'} px-5 py-2.5 text-xs sm:text-sm font-bold rounded-lg cursor-pointer flex-1 sm:flex-auto justify-center`}
            onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'dislike')}
            disabled={!!feedbackGiven}
            title="Not for us"
          >
            👎 Not for us
          </button>
          <button
            className={`btn ${feedbackGiven === 'too_similar' ? 'btn--primary' : 'btn--secondary'} px-5 py-2.5 text-xs sm:text-sm font-bold rounded-lg cursor-pointer flex-1 sm:flex-auto justify-center`}
            onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'too_similar')}
            disabled={!!feedbackGiven}
            title="Give us more variety"
          >
            🔄 More variety
          </button>
        </div>
      </div>
    </div>
  );
}
