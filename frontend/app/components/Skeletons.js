/**
 * FusionAI — Loading Skeleton Components
 * 
 * Shimmer-animated placeholders shown while data loads.
 */
'use client';

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="flex gap-lg" style={{ alignItems: 'flex-start' }}>
        <div className="skeleton skeleton-ring" />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-title" />
          <div className="flex gap-xs" style={{ marginBottom: '16px' }}>
            <div className="skeleton" style={{ width: 70, height: 20, borderRadius: 999 }} />
            <div className="skeleton" style={{ width: 50, height: 20, borderRadius: 999 }} />
            <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 999 }} />
          </div>
        </div>
      </div>
      <div className="skeleton skeleton-text" style={{ width: '100%', marginTop: 16 }} />
      <div className="skeleton skeleton-text" style={{ width: '85%' }} />
      <div style={{ marginTop: 16 }}>
        <div className="skeleton skeleton-bar" style={{ width: '70%' }} />
        <div className="skeleton skeleton-bar" style={{ width: '55%' }} />
        <div className="skeleton skeleton-bar" style={{ width: '80%' }} />
      </div>
    </div>
  );
}

export function SkeletonResults({ count = 4 }) {
  return (
    <div className="results-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTrace() {
  return (
    <div className="trace-panel">
      <div className="trace-header">
        <div className="skeleton" style={{ width: 160, height: 20 }} />
      </div>
      <div className="trace-steps" style={{ padding: '16px 24px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-md items-center" style={{ padding: '8px 0' }}>
            <div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: `${40 + i * 10}%`, height: 14 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
