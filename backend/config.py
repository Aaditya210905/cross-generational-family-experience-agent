"""
FusionAI Backend Configuration

Loads settings from environment variables with sensible defaults.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ──────────────────────────────────────────────────────────────
    app_env: str = "development"
    app_name: str = "FusionAI"
    app_version: str = "1.0.0"
    cors_origins: str = "http://localhost:3000"

    # ── Qloo (Person A manages, but needed for pipeline stubs) ───────────
    qloo_api_key: str = ""
    qloo_base_url: str = "https://api.qloo.com"
    qloo_timeout: int = 15
    qloo_max_retries: int = 3

    # ── LLM (Person B manages) ──────────────────────────────────────────
    openai_api_key: str = ""
    openai_base_url: str | None = None
    llm_model: str = "gpt-4o-mini"
    llm_timeout: int = 30
    llm_max_tokens: int = 1024

    # ── Scoring Parameters ──────────────────────────────────────────────
    blend_ratio: float = 0.7           # α in the group scoring formula
    bridge_bonus_weight: float = 0.05  # β for bridge item boost
    diversity_threshold: float = 0.7   # Jaccard threshold for dedup
    min_satisfaction_floor: float = 0.15  # Below this, candidate gets heavy penalty
    top_n_results: int = 8             # Max results to return

    # ── Rate Limiting ───────────────────────────────────────────────────
    rate_limit_per_minute: int = 30

    # ── Cache ────────────────────────────────────────────────────────────
    cache_ttl_seconds: int = 300       # 5 minutes

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
