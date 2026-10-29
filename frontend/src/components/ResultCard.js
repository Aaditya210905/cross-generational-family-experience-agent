/**
 * FusionAI — Result Card Component
 * 
 * Full recommendation card with:
 * - Score ring + title + metadata badges
 * - Group explanation
 * - Per-person match bars
 * - Expandable per-person reasons
 * - Constraint status badges
 * - Confidence note
 * - Feedback action buttons
 * - Data source label
 */
'use client';

import { useState } from 'react';
import ScoreRing from './ScoreRing';
import MatchBar from './MatchBar';

const DATA_SOURCE_LABELS = {
  live_qloo: { emoji: '🟢', label: 'Live Qloo' },
  cached_qloo: { emoji: '🟡', label: 'Cached Qloo' },
  fallback: { emoji: '🔵', label: 'Fallback' },
};

const CONSTRAINT_BADGE = {
  pass: 'badge--pass',
  warning: 'badge--warning',
  fail: 'badge--fail',
  unverified: 'badge--unverified',
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
    entity,
    group_score,
    per_person_details = [],
    bridge_themes = [],
    group_explanation,
    constraint_results = [],
    confidence_note,
    data_source,
    tags = [],
    metadata = {},
  } = result;

  const source = DATA_SOURCE_LABELS[data_source] || DATA_SOURCE_LABELS.fallback;

  // Filter meaningful constraints (skip passing ones except for display)
  const visibleConstraints = constraint_results.filter(
    (c) => c.status !== 'pass' || constraint_results.length <= 4
  );

  return (
    <div
      className="result-card"
      style={{ animationDelay: `${rank * 0.08}s` }}
      id={`result-${entity.qloo_id}`}
    >
      {/* ── Top Section: Score + Info ────────────────────────── */}
      <div className="result-card__top">
        <div className="result-card__score-area">
          <ScoreRing score={group_score} size={72} />
          <span
            className="text-sm text-muted"
            style={{ fontSize: '0.7rem', marginTop: '2px' }}
          >
            Group Match
          </span>
        </div>

        <div className="result-card__info">
          <div className="result-card__rank">#{rank + 1} Pick</div>
          <h3 className="result-card__title">{entity.name}</h3>

          <div className="result-card__meta">
            {/* Data source badge */}
            <span className="badge badge--source">
              {source.emoji} {source.label}
            </span>

            {/* Entity type */}
            <span className="badge badge--source">
              {entity.type}
            </span>

            {/* Year if available */}
            {metadata.year && (
              <span className="badge badge--source">{metadata.year}</span>
            )}

            {/* Runtime if available */}
            {metadata.runtime_min && (
              <span className="badge badge--source">
                {metadata.runtime_min} min
              </span>
            )}

            {/* Price level if available */}
            {metadata.price_level && (
              <span className="badge badge--source">
                {'$'.repeat(metadata.price_level)}
              </span>
            )}

            {/* Bridge themes */}
            {bridge_themes.map((theme) => (
              <span key={theme} className="badge badge--bridge">
                🌉 {theme.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Group Explanation ─────────────────────────────────── */}
      {group_explanation && (
        <div className="result-card__explanation">
          ✨ {group_explanation}
        </div>
      )}

      {/* ── Per-Person Match Bars ─────────────────────────────── */}
      <div className="result-card__members">
        <div className="result-card__members-title">Family Match Breakdown</div>
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

      {/* ── Expand/Collapse Per-Person Reasons ────────────────── */}
      <button
        className="result-card__expand-trigger"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span style={{
          transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>
          ▶
        </span>
        {expanded ? 'Hide details' : 'Why each person might like this'}
      </button>

      <div className={`result-card__expanded ${expanded ? 'result-card__expanded--open' : ''}`}>
        {per_person_details.map((person) => (
          <div key={person.member_id} className="result-card__person-reason">
            <div className="result-card__person-header">
              <span className="result-card__person-emoji">
                {person.avatar_emoji}
              </span>
              <span className="result-card__person-name">
                {person.nickname}
              </span>
              <span className="badge badge--source" style={{ marginLeft: 'auto' }}>
                {Math.round(person.score * 100)}%
              </span>
            </div>
            <p className="result-card__person-text">{person.reason}</p>
            {person.related_liked_items?.length > 0 && (
              <div className="flex gap-xs" style={{ marginTop: '6px', flexWrap: 'wrap' }}>
                {person.related_liked_items.map((item) => (
                  <span
                    key={item}
                    className="badge badge--bridge"
                    style={{ fontSize: '0.65rem' }}
                  >
                    {item.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Constraint badges in expanded view */}
        {visibleConstraints.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div className="result-card__members-title">Constraint Checks</div>
            <div className="result-card__constraints">
              {visibleConstraints.map((c, i) => (
                <span
                  key={i}
                  className={`badge ${CONSTRAINT_BADGE[c.status]}`}
                  title={c.message}
                >
                  {CONSTRAINT_ICON[c.status]} {c.constraint_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Confidence Note ───────────────────────────────────── */}
      {confidence_note && (
        <div className="result-card__confidence">
          {confidence_note}
        </div>
      )}

      {/* ── Feedback Actions ──────────────────────────────────── */}
      <div className="result-card__actions">
        <button
          className={`btn btn-sm ${feedbackGiven === 'like' ? 'btn-success' : 'btn-ghost'}`}
          onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'like')}
          disabled={!!feedbackGiven}
          title="I like this suggestion"
        >
          👍 Like
        </button>
        <button
          className={`btn btn-sm ${feedbackGiven === 'dislike' ? 'btn-danger' : 'btn-ghost'}`}
          onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'dislike')}
          disabled={!!feedbackGiven}
          title="Not for us"
        >
          👎 Dislike
        </button>
        <button
          className={`btn btn-sm ${feedbackGiven === 'too_similar' ? 'btn-secondary' : 'btn-ghost'}`}
          onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'too_similar')}
          disabled={!!feedbackGiven}
          title="We want more variety"
        >
          🔄 Too Similar
        </button>
      </div>
    </div>
  );
}
