/**
 * FusionAI — API Client
 * 
 * Centralized API calls to the FastAPI backend.
 * All routes go through Next.js rewrites → localhost:8000
 */

const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        body.message || body.detail || `Request failed: ${res.status}`,
        res.status,
        body
      );
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error', 0, {});
  }
}

/** Get available demo families */
export async function getDemoFamilies() {
  return request('/demo-families');
}

/** Get a specific demo family profile */
export async function getDemoFamily(familyId) {
  return request(`/demo-families/${familyId}`);
}

/** Run the recommendation pipeline */
export async function getRecommendations(familyProfile, adjustment = null) {
  return request('/recommend', {
    method: 'POST',
    body: JSON.stringify({
      family_profile: familyProfile,
      adjustment,
    }),
  });
}

/** Submit feedback */
export async function submitFeedback(familyId, feedbackItems, previousResults = []) {
  return request('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      family_id: familyId,
      feedback: feedbackItems,
      previous_results: previousResults,
    }),
  });
}

/** Clear feedback/adjustments for a family */
export async function clearFeedback(familyId) {
  return request(`/feedback/${familyId}`, { method: 'DELETE' });
}

/** Health check */
export async function healthCheck() {
  return request('/health');
}

/**
 * Connect to SSE stream for pipeline progress events.
 * Returns an EventSource instance.
 */
export function connectProgressStream(familyId, onEvent, onError, onDone) {
  const url = `${API_BASE}/stream/${familyId}`;
  const source = new EventSource(url);

  source.addEventListener('progress', (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent?.(data);
    } catch (err) {
      console.warn('Failed to parse SSE event:', err);
    }
  });

  source.addEventListener('done', (e) => {
    source.close();
    onDone?.();
  });

  source.addEventListener('error', (e) => {
    // EventSource auto-reconnects, but we close on explicit errors
    source.close();
    onError?.(e);
  });

  source.addEventListener('keepalive', () => {
    // No-op, just prevents timeout
  });

  return source;
}

export { ApiError };
