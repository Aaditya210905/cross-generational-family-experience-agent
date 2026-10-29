/**
 * FusionAI — Match Bar Component
 * 
 * Horizontal bar showing one family member's match score.
 * Avatar emoji + name + animated bar + percentage.
 */
'use client';

export default function MatchBar({ nickname, emoji, score, isEstimated }) {
  const percentage = Math.round(score * 100);

  const getBarColor = (s) => {
    if (s >= 0.75) return 'linear-gradient(90deg, #00cec9, #55efc4)';
    if (s >= 0.55) return 'linear-gradient(90deg, #6c5ce7, #a29bfe)';
    if (s >= 0.35) return 'linear-gradient(90deg, #fdcb6e, #ffeaa7)';
    return 'linear-gradient(90deg, #ff6b6b, #fab1a0)';
  };

  return (
    <div className="match-bar">
      <span className="match-bar__avatar" title={nickname}>
        {emoji || '👤'}
      </span>
      <span className="match-bar__name">{nickname}</span>
      <div className="match-bar__track">
        <div
          className="match-bar__fill"
          style={{
            width: `${percentage}%`,
            background: getBarColor(score),
          }}
        />
      </div>
      <span className="match-bar__score" style={{ opacity: isEstimated ? 0.6 : 1 }}>
        {percentage}%{isEstimated ? '~' : ''}
      </span>
    </div>
  );
}
