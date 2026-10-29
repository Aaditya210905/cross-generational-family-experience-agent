/**
 * FusionAI — Main Page
 *
 * Person B's complete results experience:
 * 1. Demo family selector (one-click load)
 * 2. Agent trace panel (live SSE progress)
 * 3. Ranked results with per-person breakdown
 * 4. Feedback loop with "what changed" view
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import AgentTrace from './components/AgentTrace';
import ResultCard from './components/ResultCard';
import { SkeletonResults, SkeletonTrace } from './components/Skeletons';
import {
  getDemoFamilies,
  getDemoFamily,
  getRecommendations,
  submitFeedback,
  clearFeedback,
  connectProgressStream,
} from './lib/api';

// ─── Demo Family Data (hardcoded for offline/fallback) ────────────────
const DEMO_FAMILIES = [
  {
    family_id: 'demo-sharma',
    label: 'The Sharma Family',
    description: 'Nani 👵🏽, Priya 👩🏽, Arjun 👦🏽 — Bollywood meets anime across three generations',
    category: 'movies',
    members: [
      { nickname: 'Nani', emoji: '👵🏽', generation: 'grandparent' },
      { nickname: 'Priya', emoji: '👩🏽', generation: 'parent' },
      { nickname: 'Arjun', emoji: '👦🏽', generation: 'teen' },
    ],
  },
  {
    family_id: 'demo-tanaka-rodriguez',
    label: 'The Tanaka-Rodriguez Family',
    description: 'Carlos 👨🏽, Yuki 👩🏻, Sofia 👧🏽 — cross-cultural fusion food adventure',
    category: 'restaurants',
    members: [
      { nickname: 'Carlos', emoji: '👨🏽', generation: 'parent' },
      { nickname: 'Yuki', emoji: '👩🏻', generation: 'parent' },
      { nickname: 'Sofia', emoji: '👧🏽', generation: 'young_adult' },
    ],
  },
  {
    family_id: 'demo-williams',
    label: 'The Williams Family',
    description: 'Grandpa Bob 👴🏻 (wheelchair), Dad Mike 👨🏻, Zoe 👧🏻, Sam 👦🏻 — sci-fi meets Disney',
    category: 'movies',
    members: [
      { nickname: 'Grandpa Bob', emoji: '👴🏻', generation: 'grandparent' },
      { nickname: 'Dad Mike', emoji: '👨🏻', generation: 'parent' },
      { nickname: 'Zoe', emoji: '👧🏻', generation: 'teen' },
      { nickname: 'Sam', emoji: '👦🏻', generation: 'child' },
    ],
  },
];

export default function Home() {
  // ── State ──────────────────────────────────────────────────────────
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familyProfile, setFamilyProfile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [traceEvents, setTraceEvents] = useState([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [adjustmentSet, setAdjustmentSet] = useState(null);
  const [changesSummary, setChangesSummary] = useState('');
  const [round, setRound] = useState(1);
  const sseRef = useRef(null);

  // ── Select Demo Family ─────────────────────────────────────────────
  const handleSelectFamily = useCallback(async (family) => {
    setSelectedFamily(family);
    setResults(null);
    setError(null);
    setTraceEvents([]);
    setFeedbackMap({});
    setAdjustmentSet(null);
    setChangesSummary('');
    setRound(1);

    try {
      const data = await getDemoFamily(family.family_id);
      setFamilyProfile(data.profile);
    } catch (err) {
      // Fallback: we'll still try to run recommendations
      console.warn('Could not fetch demo family from API, proceeding anyway:', err.message);
      setFamilyProfile({ family_id: family.family_id });
    }
  }, []);

  // ── Run Recommendations ────────────────────────────────────────────
  const handleRunPipeline = useCallback(async () => {
    if (!selectedFamily) return;

    setLoading(true);
    setError(null);
    setTraceEvents([]);
    setPipelineRunning(true);
    setResults(null);

    // Connect SSE stream for progress
    try {
      if (sseRef.current) {
        sseRef.current.close();
      }
      sseRef.current = connectProgressStream(
        selectedFamily.family_id,
        (event) => {
          setTraceEvents((prev) => {
            // Replace or append event by step+status
            const existing = prev.findIndex(
              (e) => e.step === event.step && e.status !== 'completed'
            );
            if (existing >= 0 && event.status !== 'in_progress') {
              const updated = [...prev];
              updated[existing] = event;
              return updated;
            }
            return [...prev, event];
          });
        },
        (err) => {
          console.warn('SSE error:', err);
        },
        () => {
          setPipelineRunning(false);
        }
      );
    } catch (err) {
      console.warn('SSE connection failed:', err);
    }

    // Call the recommendation endpoint
    try {
      const profile = familyProfile || { family_id: selectedFamily.family_id };
      const res = await getRecommendations(profile, adjustmentSet);
      setResults(res);
    } catch (err) {
      setError(err.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
      setPipelineRunning(false);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    }
  }, [selectedFamily, familyProfile, adjustmentSet]);

  // ── Handle Feedback ────────────────────────────────────────────────
  const handleFeedback = useCallback(
    async (candidateId, candidateName, reaction) => {
      setFeedbackMap((prev) => ({ ...prev, [candidateId]: reaction }));

      try {
        const adj = await submitFeedback(
          selectedFamily.family_id,
          [{ candidate_id: candidateId, candidate_name: candidateName, reaction }],
          results?.results?.map((r) => r.entity.qloo_id) || []
        );
        setAdjustmentSet(adj);
        setChangesSummary(adj.feedback_summary || '');
      } catch (err) {
        console.warn('Feedback submission failed:', err);
      }
    },
    [selectedFamily, results]
  );

  // ── Regenerate with Feedback ───────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    setRound((r) => r + 1);
    setFeedbackMap({});
    await handleRunPipeline();
  }, [handleRunPipeline]);

  // ── Reset Everything ───────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    if (selectedFamily) {
      try {
        await clearFeedback(selectedFamily.family_id);
      } catch (e) { /* ignore */ }
    }
    setSelectedFamily(null);
    setFamilyProfile(null);
    setResults(null);
    setError(null);
    setTraceEvents([]);
    setFeedbackMap({});
    setAdjustmentSet(null);
    setChangesSummary('');
    setRound(1);
  }, [selectedFamily]);

  // Has any feedback been given?
  const hasFeedback = Object.keys(feedbackMap).length > 0;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <main className="app-container">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="page-header">
        <h1>🎯 FusionAI</h1>
        <p>
          Find activities that every generation in your family will love.
          <br />
          <span className="text-muted text-sm">
            Powered by Qloo&apos;s cultural taste graph
          </span>
        </p>
      </header>

      {/* ── Family Selection ───────────────────────────────────────── */}
      {!selectedFamily && (
        <section>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>
            Choose a Demo Family
          </h2>
          <p style={{ textAlign: 'center', marginBottom: '24px', fontSize: '0.9rem' }}>
            One-click load — no typing needed
          </p>

          <div className="family-selector">
            {DEMO_FAMILIES.map((family) => (
              <div
                key={family.family_id}
                className="family-card"
                onClick={() => handleSelectFamily(family)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectFamily(family)}
              >
                <div className="family-card__title">{family.label}</div>
                <div className="family-card__description">
                  {family.description}
                </div>
                <div className="family-card__members">
                  {family.members.map((m) => (
                    <span key={m.nickname} className="family-card__member">
                      {m.emoji} {m.nickname}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <span className="badge badge--source">
                    {family.category === 'movies' ? '🎬' : '🍽️'} {family.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Selected Family + Controls ─────────────────────────────── */}
      {selectedFamily && (
        <section>
          <div className="flex items-center justify-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ marginBottom: '4px' }}>
                {selectedFamily.label}
              </h2>
              <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                {selectedFamily.members.map((m) => (
                  <span key={m.nickname} className="family-card__member">
                    {m.emoji} {m.nickname}
                  </span>
                ))}
                {round > 1 && (
                  <span className="badge badge--bridge">Round {round}</span>
                )}
              </div>
            </div>

            <div className="flex gap-sm">
              {!results && !loading && (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleRunPipeline}
                  id="btn-generate"
                >
                  ✨ Generate Recommendations
                </button>
              )}
              <button
                className="btn btn-ghost"
                onClick={handleReset}
                id="btn-reset"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* ── Error Banner ─────────────────────────────────────────── */}
          {error && (
            <div className="error-banner">
              <span>⚠️</span>
              <span>{error}</span>
              <button
                className="btn btn-sm btn-ghost"
                onClick={handleRunPipeline}
                style={{ marginLeft: 'auto' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ── What Changed Banner ──────────────────────────────────── */}
          {changesSummary && round > 1 && (
            <div className="changes-banner">
              <div className="changes-banner__title">
                🔄 What Changed (Round {round})
              </div>
              <div className="changes-banner__text">{changesSummary}</div>
            </div>
          )}

          {/* ── Agent Trace Panel ────────────────────────────────────── */}
          {(traceEvents.length > 0 || pipelineRunning) && (
            <AgentTrace events={traceEvents} isRunning={pipelineRunning} />
          )}
          {loading && traceEvents.length === 0 && <SkeletonTrace />}

          {/* ── Loading Skeletons ─────────────────────────────────────── */}
          {loading && !results && <SkeletonResults count={4} />}

          {/* ── Results ──────────────────────────────────────────────── */}
          {results && results.results && (
            <section>
              <div className="results-header">
                <div>
                  <h2 style={{ marginBottom: '4px' }}>
                    {results.results.length === 0
                      ? 'No Results'
                      : `Top ${results.results.length} Picks`}
                  </h2>
                  <p className="text-sm text-muted">
                    From {results.total_candidates_considered} candidates considered,{' '}
                    {results.total_after_constraints} passed constraints
                  </p>
                </div>

                <div className="results-stats">
                  <div className="results-stat">
                    <div className="results-stat__value">
                      {results.total_candidates_considered}
                    </div>
                    <div className="results-stat__label">Considered</div>
                  </div>
                  <div className="results-stat">
                    <div className="results-stat__value">
                      {results.total_after_constraints}
                    </div>
                    <div className="results-stat__label">Passed</div>
                  </div>
                  <div className="results-stat">
                    <div className="results-stat__value">
                      {results.results.length}
                    </div>
                    <div className="results-stat__label">Shown</div>
                  </div>
                </div>
              </div>

              {/* ── Result Cards ────────────────────────────────────── */}
              {results.results.length > 0 ? (
                <div className="results-grid">
                  {results.results.map((result, index) => (
                    <ResultCard
                      key={result.entity.qloo_id}
                      result={result}
                      rank={index}
                      onFeedback={handleFeedback}
                      feedbackGiven={feedbackMap[result.entity.qloo_id]}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state__icon">😅</div>
                  <h3 className="empty-state__title">No matches found</h3>
                  <p className="empty-state__text">
                    Try adjusting your constraints or preferences to widen the search.
                  </p>
                </div>
              )}

              {/* ── Regenerate Button ──────────────────────────────── */}
              {hasFeedback && (
                <div className="text-center mt-lg">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleRegenerate}
                    id="btn-regenerate"
                  >
                    🔄 Regenerate with Feedback
                  </button>
                  <p className="text-sm text-muted" style={{ marginTop: '8px' }}>
                    Your feedback adjusts scoring and filtering for the next round
                  </p>
                </div>
              )}

              {/* ── Scoring Transparency ───────────────────────────── */}
              {results.scoring_params && (
                <details
                  className="glass-card"
                  style={{ marginTop: '32px', cursor: 'pointer' }}
                >
                  <summary
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    📐 Scoring Parameters (Transparency)
                  </summary>
                  <div style={{ marginTop: '12px' }}>
                    <p className="text-sm" style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
                      group_score = α × weighted_avg + (1 − α) × min_score + bridge_bonus
                    </p>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '8px',
                      }}
                    >
                      {Object.entries(results.scoring_params).map(([key, val]) => (
                        <div key={key} className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                            {typeof val === 'number' ? val.toFixed(2) : val}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {key.replace(/_/g, ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </section>
          )}
        </section>
      )}

      {/* ── Attribution Footer ─────────────────────────────────────── */}
      <footer className="attribution">
        <p>
          Powered by{' '}
          <a href="https://qloo.com" target="_blank" rel="noopener noreferrer">
            Qloo
          </a>{' '}
          — Cultural taste intelligence
        </p>
        <p style={{ marginTop: '4px' }}>
          Group ranking, constraint filtering, and explanations are our original algorithms
        </p>
      </footer>
    </main>
  );
}
