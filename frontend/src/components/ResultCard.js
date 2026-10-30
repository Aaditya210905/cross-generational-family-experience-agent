/**
 * FusionAI — Result Card Component
 * 
 * Modern recommendation card with:
 * - Score ring + glowing top-pick badges
 * - Consensus group explanation with standard typography
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
  live_qloo: { emoji: '🟢', label: 'Live Qloo Engine' },
  cached_qloo: { emoji: '🟡', label: 'Cached Intelligence' },
  fallback: { emoji: '🟣', label: 'Synthesized Consensus' },
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
      className={`result-card ${isTopPick ? 'border-violet-400/60 shadow-[0_0_40px_rgba(139,92,246,0.3)] bg-gradient-to-br from-violet-950/20 via-[#0d0e1a] to-[#0a0a14]' : ''}`}
      style={{ animationDelay: `${rank * 0.08}s` }}
      id={`result-${entity.qloo_id}`}
    >
      {/* Top Banner for #1 Pick */}
      {isTopPick && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-violet-600 via-fuchsia-600 to-pink-600 text-xs uppercase tracking-widest font-black text-white px-5 py-1.5 rounded-bl-2xl shadow-lg flex items-center gap-2">
          <span>👑 #1 Family Consensus</span>
        </div>
      )}

      {/* ── Top Section: Score + Info ────────────────────────── */}
      <div className="result-card__top">
        <div className="result-card__score-area flex flex-col items-center">
          <ScoreRing score={group_score} size={88} />
          <span className="text-xs font-bold text-slate-300 mt-2 uppercase tracking-wider">
            Consensus
          </span>
        </div>

        <div className="result-card__info">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-violet-300 font-mono">
              Recommendation #{rank + 1}
            </span>
            <span className="text-slate-600">•</span>
            <span className="badge badge--source text-xs font-semibold">
              {source.emoji} {source.label}
            </span>
          </div>

          <h3 className="result-card__title">{entity.name}</h3>

          <div className="result-card__meta">
            {entity.type && (
              <span className="badge badge--source capitalize text-xs">
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

      {/* ── Group Explanation ─────────────────────────────────── */}
      {group_explanation && (
        <div className="mt-5 p-4 rounded-xl bg-violet-500/[0.07] border border-violet-500/20 text-slate-200">
          <div className="flex items-start gap-3">
            <span className="text-lg text-violet-400 mt-0.5">✨</span>
            <span className="leading-relaxed text-sm sm:text-base font-medium">
              {group_explanation}
            </span>
          </div>
        </div>
      )}

      {/* ── Per-Person Match Bars ─────────────────────────────── */}
      <div className="result-card__members">
        <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
          <span>Cohort Harmony Breakdown</span>
          <span className="text-xs text-slate-400 font-normal">Fairness-weighted individual affinity</span>
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

      {/* ── Expand/Collapse Per-Person Reasons ────────────────── */}
      <button
        type="button"
        className="result-card__expand-trigger group cursor-pointer pt-3"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}
          className="text-violet-400 group-hover:scale-125 text-sm"
        >
          ▶
        </span>
        <span className="group-hover:text-white transition-colors text-sm font-semibold">
          {expanded ? 'Hide individual member breakdown' : 'View why each family member will love this recommendation'}
        </span>
      </button>

      <div className={`result-card__expanded ${expanded ? 'result-card__expanded--open' : ''}`}>
        <div className="space-y-3 mt-3">
          {per_person_details.map((person) => (
            <div key={person.member_id} className="result-card__person-reason">
              <div className="result-card__person-header">
                <span className="result-card__person-emoji">
                  {person.avatar_emoji}
                </span>
                <span className="result-card__person-name">
                  {person.nickname}
                </span>
                <span className="badge badge--source ml-auto font-mono text-violet-300 text-xs font-bold">
                  {Math.round(person.score * 100)}% match
                </span>
              </div>
              <p className="result-card__person-text">{person.reason}</p>
              {person.related_liked_items?.length > 0 && (
                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                  {person.related_liked_items.map((item) => (
                    <span
                      key={item}
                      className="badge badge--bridge text-xs"
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
          <div className="mt-5 pt-4 border-t border-white/[0.08]">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
              Constraint Verification
            </div>
            <div className="result-card__constraints">
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

      {/* ── Confidence Note ───────────────────────────────────── */}
      {confidence_note && (
        <div className="result-card__confidence text-xs sm:text-sm text-slate-400">
          ℹ️ {confidence_note}
        </div>
      )}

      {/* ── Feedback Actions ──────────────────────────────────── */}
      <div className="result-card__actions flex flex-wrap gap-3">
        <button
          className={`btn ${feedbackGiven === 'like' ? 'btn-success' : 'btn-secondary'} px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl cursor-pointer`}
          onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'like')}
          disabled={!!feedbackGiven}
          title="We love this suggestion"
        >
          👍 We Love This
        </button>
        <button
          className={`btn ${feedbackGiven === 'dislike' ? 'btn-danger' : 'btn-secondary'} px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl cursor-pointer`}
          onClick={() => onFeedback?.(entity.qloo_id, entity.name, 'dislike')}
          disabled={!!feedbackGiven}
          title="Not for us"
        >
          👎 Not For Us
        </button>
        <button
          className={`btn ${feedbackGiven === 'too_similar' ? 'btn-primary' : 'btn-secondary'} px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl cursor-pointer`}
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
