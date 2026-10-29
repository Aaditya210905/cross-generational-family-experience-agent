/**
 * FusionAI — Result Card Component
 * 
 * Futuristic recommendation card with:
 * - Score ring + glowing top-pick badges
 * - Consensus group explanation
 * - Per-person match bars with avatars
 * - Expandable reasoning breakdown
 * - Constraint status badges & confidence notes
 * - Interactive feedback actions (Like, Dislike, Variety)
 */
'use client';

import { useState } from 'react';
import ScoreRing from './ScoreRing';
import MatchBar from './MatchBar';

const DATA_SOURCE_LABELS = {
  live_qloo: { emoji: '🟢', label: 'Live Qloo' },
  cached_qloo: { emoji: '🟡', label: 'Cached Qloo' },
  fallback: { emoji: '🔵', label: 'Synthesized' },
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
      className={`result-card ${isTopPick ? 'border-indigo-500/50 shadow-[0_0_35px_rgba(99,102,241,0.25)]' : ''}`}
      style={{ animationDelay: `${rank * 0.08}s` }}
      id={`result-${entity.qloo_id}`}
    >
      {/* Top Banner for #1 Pick */}
      {isTopPick && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-600 text-[10px] uppercase tracking-widest font-black text-white px-4 py-1 rounded-bl-xl shadow-md flex items-center gap-1.5">
          <span>👑 #1 Family Consensus</span>
        </div>
      )}

      {/* ── Top Section: Score + Info ────────────────────────── */}
      <div className="result-card__top">
        <div className="result-card__score-area">
          <ScoreRing score={group_score} size={76} />
          <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
            Consensus
          </span>
        </div>

        <div className="result-card__info">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400 font-mono">
              Pick #{rank + 1}
            </span>
            <span className="text-slate-600">•</span>
            <span className="badge badge--source">
              {source.emoji} {source.label}
            </span>
          </div>

          <h3 className="result-card__title">{entity.name}</h3>

          <div className="result-card__meta">
            {entity.type && (
              <span className="badge badge--source capitalize">
                {entity.type}
              </span>
            )}

            {metadata.year && (
              <span className="badge badge--source">📅 {metadata.year}</span>
            )}

            {metadata.runtime_min && (
              <span className="badge badge--source">⏱️ {metadata.runtime_min}m</span>
            )}

            {metadata.price_level && (
              <span className="badge badge--source">
                {'💲'.repeat(metadata.price_level)}
              </span>
            )}

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
          <div className="flex items-start gap-2">
            <span className="text-base text-indigo-400">✨</span>
            <span className="leading-relaxed">{group_explanation}</span>
          </div>
        </div>
      )}

      {/* ── Per-Person Match Bars ─────────────────────────────── */}
      <div className="result-card__members">
        <div className="result-card__members-title">Cohort Harmony Breakdown</div>
        <div className="space-y-1.5">
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

      {/* ── Expand/Collapse Per-Person Reasons ────────────────── */}
      <button
        className="result-card__expand-trigger group"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}
          className="text-indigo-400 group-hover:scale-125"
        >
          ▶
        </span>
        <span className="group-hover:text-white transition-colors">
          {expanded ? 'Hide individual member breakdown' : 'Why each family member might love this'}
        </span>
      </button>

      <div className={`result-card__expanded ${expanded ? 'result-card__expanded--open' : ''}`}>
        <div className="space-y-2 mt-2">
          {per_person_details.map((person) => (
            <div key={person.member_id} className="result-card__person-reason">
              <div className="result-card__person-header">
                <span className="result-card__person-emoji">
                  {person.avatar_emoji}
                </span>
                <span className="result-card__person-name">
                  {person.nickname}
                </span>
                <span className="badge badge--source ml-auto font-mono text-indigo-300">
                  {Math.round(person.score * 100)}% match
                </span>
              </div>
              <p className="result-card__person-text">{person.reason}</p>
              {person.related_liked_items?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {person.related_liked_items.map((item) => (
                    <span
                      key={item}
                      className="badge badge--bridge text-[10px]"
                    >
                      Linked to: {item.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Constraint badges in expanded view */}
        {visibleConstraints.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.08]">
            <div className="result-card__members-title">Constraint Verification</div>
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
          ℹ️ {confidence_note}
        </div>
      )}

      {/* ── Feedback Actions ──────────────────────────────────── */}
      <div className="result-card__actions">
        <button
          className={`btn btn-sm ${feedbackGiven === 'like' ? 'btn-success' : 'btn-secondary'}`}
          onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'like')}
          disabled={!!feedbackGiven}
          title="We love this suggestion"
        >
          👍 We Love This
        </button>
        <button
          className={`btn btn-sm ${feedbackGiven === 'dislike' ? 'btn-danger' : 'btn-secondary'}`}
          onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'dislike')}
          disabled={!!feedbackGiven}
          title="Not for us"
        >
          👎 Not For Us
        </button>
        <button
          className={`btn btn-sm ${feedbackGiven === 'too_similar' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'too_similar')}
          disabled={!!feedbackGiven}
          title="Give us more variety"
        >
          🔄 More Variety
        </button>
      </div>
    </div>
  );
}
