/**
 * FamilyFusion AI — TypeScript Types
 *
 * Mirrors the backend Pydantic contracts.
 */

export type GenerationLabel = "grandparent" | "parent" | "teen" | "child" | "young_adult";
export type CategoryType = "movies" | "restaurants" | "activities";
export type ConfidenceLevel = "high" | "medium" | "low" | "unresolved";
export type BudgetBand = "free" | "low" | "medium" | "high" | "any";
export type EnergyLevel = "low" | "medium" | "high" | "any";

export interface Preference {
  text: string;
  category?: CategoryType;
  is_dislike: boolean;
}

export interface FamilyMember {
  id: string;
  nickname: string;
  generation: GenerationLabel;
  liked_items: Preference[];
  disliked_items: Preference[];
}

export interface ResolvedEntity {
  qloo_id: string;
  name: string;
  entity_type: string;
  confidence: ConfidenceLevel;
  original_text: string;
  tags: string[];
  properties: Record<string, unknown>;
  needs_confirmation: boolean;
  user_confirmed: boolean;
  alternatives: ResolvedEntity[];
}

export interface ResolvedMember {
  member_id: string;
  nickname: string;
  resolved_likes: ResolvedEntity[];
  resolved_dislikes: ResolvedEntity[];
  unresolved: string[];
}

export interface ResolvedProfile {
  members: ResolvedMember[];
  resolution_stats: Record<string, number>;
}

export interface ConstraintConfig {
  budget: BudgetBand;
  location?: string;
  at_home: boolean;
  time_available_minutes?: number;
  energy_level: EnergyLevel;
  dietary_restrictions: string[];
  mobility_notes?: string;
}

export interface FamilyProfileRequest {
  members: FamilyMember[];
  category: CategoryType;
  constraints?: ConstraintConfig;
}

export interface DemoFamily {
  name: string;
  description: string;
  members: Array<{
    id: string;
    nickname: string;
    generation: GenerationLabel;
    liked_items: Array<{ text: string; category: string }>;
    disliked_items: Array<{ text: string; category: string }>;
  }>;
}

export interface DemoFamilySummary {
  name: string;
  description: string;
  member_count: number;
}

// Generation metadata for UI
export const GENERATION_META: Record<
  GenerationLabel,
  { label: string; emoji: string; color: string; bgColor: string }
> = {
  grandparent: { label: "Grandparent", emoji: "👴", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  parent: { label: "Parent", emoji: "👨", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  young_adult: { label: "Young Adult", emoji: "🧑", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  teen: { label: "Teen", emoji: "🧑‍🎤", color: "text-pink-400", bgColor: "bg-pink-500/10" },
  child: { label: "Child", emoji: "👧", color: "text-green-400", bgColor: "bg-green-500/10" },
};

export const CATEGORY_META: Record<
  CategoryType,
  { label: string; emoji: string; description: string }
> = {
  movies: { label: "Movies & Shows", emoji: "🎬", description: "Films and TV shows everyone will enjoy" },
  restaurants: { label: "Restaurants & Food", emoji: "🍽️", description: "Dining spots for the whole family" },
  activities: { label: "Activities & Outings", emoji: "🎯", description: "Fun things to do together" },
};
