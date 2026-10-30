/**
 * FusionAI — Score Ring Component
 *
 * Clean circular progress gauge with warm accent colors
 * and crisp typography.
 */

'use client';

export default function ScoreRing({ score, size = 76, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, score)));
  const percentage = Math.round(score * 100);

  const gradientId = `score-grad-${percentage}`;

  // Warm accent colors based on score
  const getGradientColors = (s) => {
    if (s >= 0.75) return { start: '#65a30d', end: '#4d7c0f' }; // Sage green
    if (s >= 0.55) return { start: '#b45309', end: '#92400e' }; // Warm amber
    if (s >= 0.35) return { start: '#d97706', end: '#b45309' }; // Amber
    return { start: '#c2410c', end: '#a3330a' };                 // Terracotta
  };

  const { start, end } = getGradientColors(score);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={start} />
            <stop offset="100%" stopColor={end} />
          </linearGradient>
        </defs>
        <circle
          className="score-ring__bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="score-ring__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="score-ring__label" style={{ color: end }}>
        {percentage}%
      </span>
    </div>
  );
}
