/**
 * FusionAI — Unified API Client
 *
 * Shared API client for communicating with the FastAPI backend.
 * Combines Person A (resolve, retrieve) and Person B (recommend, feedback, stream).
 * All /api/* routes are proxied via Next.js rewrites → localhost:8000
 */

import type { ResolvedProfile } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// ── Error Class ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  detail?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    detail?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// ── Generic Request Helper ──────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let detail: Record<string, unknown> | undefined;
    try {
      detail = await response.json();
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(
      response.status,
      (detail?.message as string) || (detail?.detail as string) || `API error ${response.status}`,
      detail,
    );
  }

  return response.json();
}

// ── Person A: Entity Resolution & Retrieval ─────────────────────────────────

export async function resolvePreferences(body: {
  members: Array<{
    id: string;
    nickname: string;
    generation: string;
    liked_items: Array<{ text: string; category?: string; is_dislike: boolean }>;
    disliked_items: Array<{ text: string; category?: string; is_dislike: boolean }>;
  }>;
  category: string;
}): Promise<ResolvedProfile> {
  return request<ResolvedProfile>("/api/resolve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function retrieveCandidates(body: {
  profile: unknown;
  category: string;
  location?: string;
}) {
  return request<{
    candidates: Array<{
      entity_id: string;
      name: string;
      entity_type: string;
      tags: string[];
      properties: Record<string, unknown>;
      per_person_scores: Array<{
        member_id: string;
        score: number;
        source: string;
      }>;
      source_members: string[];
      data_source: string;
    }>;
    category: string;
    member_ids: string[];
    pool_stats: Record<string, unknown>;
  }>("/api/retrieve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Person B: Recommend, Feedback, Stream ───────────────────────────────────

export async function getRecommendations(
  familyProfile: unknown,
  adjustment: unknown = null,
) {
  return request<unknown>("/api/recommend", {
    method: "POST",
    body: JSON.stringify({
      family_profile: familyProfile,
      adjustment,
    }),
  });
}

export async function submitFeedback(
  familyId: string,
  feedbackItems: unknown[],
  previousResults: unknown[] = [],
) {
  return request<unknown>("/api/feedback", {
    method: "POST",
    body: JSON.stringify({
      family_id: familyId,
      feedback: feedbackItems,
      previous_results: previousResults,
    }),
  });
}

export async function clearFeedback(familyId: string) {
  return request<{ status: string; family_id: string }>(
    `/api/feedback/${familyId}`,
    { method: "DELETE" },
  );
}

// ── Demo Families ───────────────────────────────────────────────────────────

export async function getDemoFamilies() {
  return request<
    Array<{
      family_id: string;
      label: string;
      description: string;
      member_count: number;
      category: string;
      members: Array<{
        nickname: string;
        generation: string;
        avatar_emoji?: string;
        liked_count?: number;
      }>;
    }>
  >("/api/demo-families");
}

export async function getDemoFamily(familyId: string) {
  return request<{
    family_id: string;
    label: string;
    description: string;
    profile: unknown;
  }>(`/api/demo-families/${familyId}`);
}

// ── Health ───────────────────────────────────────────────────────────────────

export async function healthCheck() {
  return request<{
    status: string;
    app: string;
    version: string;
    environment: string;
    llm_configured: boolean;
    qloo_configured: boolean;
  }>("/api/health");
}

// ── SSE Streaming ───────────────────────────────────────────────────────────

export function connectProgressStream(
  familyId: string,
  onEvent?: (data: unknown) => void,
  onError?: (e: Event) => void,
  onDone?: () => void,
): EventSource {
  const url = `${API_BASE}/api/stream/${familyId}`;
  const source = new EventSource(url);

  source.addEventListener("progress", (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onEvent?.(data);
    } catch (err) {
      console.warn("Failed to parse SSE event:", err);
    }
  });

  source.addEventListener("done", () => {
    source.close();
    onDone?.();
  });

  source.addEventListener("error", (e: Event) => {
    source.close();
    onError?.(e);
  });

  source.addEventListener("keepalive", () => {
    // No-op, just prevents timeout
  });

  return source;
}
