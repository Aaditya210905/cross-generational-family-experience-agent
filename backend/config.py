"""
FamilyFusion AI — Backend Configuration

Loads all settings from environment variables with validation.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional

# Resolve the .env file relative to this file's directory
_BACKEND_DIR = Path(__file__).resolve().parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Qloo API
    qloo_api_key: str = Field(
        default="demo_key_placeholder",
        description="Qloo hackathon API key",
    )
    qloo_base_url: str = Field(
        default="https://hackathon.api.qloo.com",
        description="Qloo API base URL (hackathon-specific)",
    )
    qloo_timeout_connect: float = Field(default=5.0, description="Connection timeout in seconds")
    qloo_timeout_read: float = Field(default=15.0, description="Read timeout in seconds")
    qloo_max_retries: int = Field(default=3, description="Max retry attempts for Qloo calls")

    # LLM (Person B will use this, but we configure it)
    llm_api_key: Optional[str] = Field(default=None, description="LLM API key")
    llm_provider: str = Field(default="claude", description="LLM provider: claude or openai")

    # CORS
    allowed_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated allowed origins",
    )

    # Cache
    cache_ttl_seconds: int = Field(default=1800, description="Cache TTL in seconds (30 min)")

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")

    model_config = {
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated origins into a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


# Singleton instance
settings = Settings()
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
