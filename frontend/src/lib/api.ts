/**
 * FamilyFusion AI — API Client
 *
 * Shared API client for communicating with the FastAPI backend.
 * Person A owns this file.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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
      detail?.message as string || `API error ${response.status}`,
      detail,
    );
  }

  return response.json();
}

// ── API Functions ────────────────────────────────────────────────────────────

export async function healthCheck() {
  return request<{
    status: string;
    service: string;
    qloo: { status: string; authenticated: boolean };
    cache: { entries: number; hits: number; misses: number; hit_rate: number };
  }>("/health");
}

export async function getDemoFamilies() {
  return request<Record<string, { name: string; description: string; member_count: number }>>(
    "/api/demo-families",
  );
}

export async function getDemoFamily(key: string) {
  return request<{
    name: string;
    description: string;
    members: Array<{
      id: string;
      nickname: string;
      generation: string;
      liked_items: Array<{ text: string; category: string }>;
      disliked_items: Array<{ text: string; category: string }>;
    }>;
  }>(`/api/demo-families/${key}`);
}

export async function resolvePreferences(body: {
  members: Array<{
    id: string;
    nickname: string;
    generation: string;
    liked_items: Array<{ text: string; category?: string; is_dislike: boolean }>;
    disliked_items: Array<{ text: string; category?: string; is_dislike: boolean }>;
  }>;
  category: string;
}) {
  return request<{
    members: Array<{
      member_id: string;
      nickname: string;
      resolved_likes: Array<{
        qloo_id: string;
        name: string;
        entity_type: string;
        confidence: string;
        original_text: string;
        tags: string[];
        needs_confirmation: boolean;
        alternatives: Array<{ qloo_id: string; name: string }>;
      }>;
      resolved_dislikes: Array<{
        qloo_id: string;
        name: string;
        entity_type: string;
        confidence: string;
        original_text: string;
      }>;
      unresolved: string[];
    }>;
    resolution_stats: Record<string, number>;
  }>("/api/resolve", {
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

export { ApiError };
