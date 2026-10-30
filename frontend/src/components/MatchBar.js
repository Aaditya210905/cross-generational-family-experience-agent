/**
 * FusionAI — Match Bar Component
 *
 * Clean horizontal bar displaying one family member's affinity score.
 */

'use client';

export default function MatchBar({ nickname, emoji, score, isEstimated }) {
  const percentage = Math.round(score * 100);

  const getBarColor = (s) => {
    if (s >= 0.75) return '#65a30d'; // Sage green
    if (s >= 0.55) return '#b45309'; // Warm amber
    if (s >= 0.35) return '#d97706'; // Amber
    return '#c2410c'; // Terracotta
  };

  return (
    <div className="match-bar group">
      <span className="match-bar__avatar" title={nickname}>
        {emoji || '👤'}
      </span>
      <span className="match-bar__name group-hover:text-text-primary transition-colors" title={nickname}>
        {nickname}
      </span>
      <div className="match-bar__track">
        <div
          className="match-bar__fill"
          style={{
            width: `${percentage}%`,
            background: getBarColor(score),
          }}
        />
      </div>
      <span className="match-bar__score font-mono" style={{ opacity: isEstimated ? 0.6 : 1 }}>
        {percentage}%{isEstimated ? '~' : ''}
      </span>
    </div>
  );
}
