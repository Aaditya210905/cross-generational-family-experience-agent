"""
FusionAI Backend Configuration

Loads settings from environment variables with sensible defaults.
Unified config for both Person A (Qloo/entity resolution) and Person B (ranking/LLM).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Resolve the .env file relative to the project root
_BACKEND_DIR = Path(__file__).resolve().parent
_ENV_FILE = _BACKEND_DIR.parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ──────────────────────────────────────────────────────────────
    app_env: str = "development"
    app_name: str = "FusionAI"
    app_version: str = "1.0.0"
    log_level: str = "INFO"

    # ── CORS ─────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000"

    # ── Qloo (Person A) ─────────────────────────────────────────────────
    qloo_api_key: str = Field(
        default="",
        description="Qloo hackathon API key",
    )
    qloo_base_url: str = Field(
        default="https://hackathon.api.qloo.com",
        description="Qloo API base URL (hackathon-specific)",
    )
    qloo_timeout_connect: float = Field(default=5.0, description="Connection timeout in seconds")
    qloo_timeout_read: float = Field(default=15.0, description="Read timeout in seconds")
    qloo_timeout: int = Field(default=15, description="General timeout in seconds")
    qloo_max_retries: int = Field(default=3, description="Max retry attempts for Qloo calls")

    # ── LLM (Person B) ──────────────────────────────────────────────────
    openai_api_key: str = Field(default="", description="OpenAI / LLM API key")
    openai_base_url: Optional[str] = Field(
        default=None,
        description="Custom base URL for LLM (Gemini, Groq, OpenRouter, Ollama, etc.)",
    )
    llm_model: str = Field(default="gpt-4o-mini", description="LLM model name")
    llm_timeout: int = Field(default=30, description="LLM timeout in seconds")
    llm_max_tokens: int = Field(default=1024, description="Max LLM response tokens")

    # ── Scoring Parameters (Person B) ───────────────────────────────────
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
        env_file=(".env", str(_BACKEND_DIR / ".env"), str(_BACKEND_DIR.parent / ".env")),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()


# Backward-compatible singleton (Person A code uses `settings` directly)
settings = get_settings()
