/**
 * FusionAI — Score Ring Component
 * 
 * Circular progress ring showing group score with animated fill.
 * Color shifts from red → yellow → green based on score.
 */
'use client';

export default function ScoreRing({ score, size = 72, strokeWidth = 5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, score)));
  const percentage = Math.round(score * 100);

  // Color based on score
  const getColor = (s) => {
    if (s >= 0.75) return '#00cec9';
    if (s >= 0.55) return '#a29bfe';
    if (s >= 0.35) return '#fdcb6e';
    return '#ff6b6b';
  };

  const color = getColor(score);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
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
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="score-ring__label" style={{ color }}>
        {percentage}%
      </span>
    </div>
  );
}
