/**
 * FusionAI — Match Bar Component
 * 
 * Futuristic horizontal bar displaying one family member's affinity score.
 */
'use client';

export default function MatchBar({ nickname, emoji, score, isEstimated }) {
  const percentage = Math.round(score * 100);

  const getBarGradient = (s) => {
    if (s >= 0.75) return 'linear-gradient(90deg, #10b981, #06b6d4)';
    if (s >= 0.55) return 'linear-gradient(90deg, #6366f1, #a855f7)';
    if (s >= 0.35) return 'linear-gradient(90deg, #f59e0b, #facc15)';
    return 'linear-gradient(90deg, #f43f5e, #fb7185)';
  };

  return (
    <div className="match-bar group">
      <span className="match-bar__avatar" title={nickname}>
        {emoji || '👤'}
      </span>
      <span className="match-bar__name group-hover:text-white transition-colors" title={nickname}>
        {nickname}
      </span>
      <div className="match-bar__track">
        <div
          className="match-bar__fill"
          style={{
            width: `${percentage}%`,
            background: getBarGradient(score),
          }}
        />
      </div>
      <span className="match-bar__score font-mono" style={{ opacity: isEstimated ? 0.7 : 1 }}>
        {percentage}%{isEstimated ? '~' : ''}
      </span>
    </div>
  );
}
