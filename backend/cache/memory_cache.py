"""
In-Memory TTL Cache

Simple dictionary-based cache with per-entry TTL expiration.
Keeps Qloo responses private (never committed) and saves API quota.
Optionally upgradeable to Redis/Upstash later.
"""

import time
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class MemoryCache:
    """Thread-safe in-memory cache with TTL expiration."""

    def __init__(self, default_ttl: int = 1800):
        """
        Args:
            default_ttl: Default time-to-live in seconds (30 min).
        """
        self._store: dict[str, tuple[Any, float]] = {}
        self._default_ttl = default_ttl
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache.
        
        Returns None if the key doesn't exist or has expired.
        """
        entry = self._store.get(key)
        if entry is None:
            self._misses += 1
            return None

        value, expires_at = entry
        if time.time() > expires_at:
            # Expired — remove and return None
            del self._store[key]
            self._misses += 1
            logger.debug(f"Cache expired: {key[:16]}...")
            return None

        self._hits += 1
        logger.debug(f"Cache hit: {key[:16]}...")
        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set a value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to store
            ttl: Optional TTL override in seconds
        """
        ttl = ttl or self._default_ttl
        expires_at = time.time() + ttl
        self._store[key] = (value, expires_at)
        logger.debug(f"Cache set: {key[:16]}... (TTL={ttl}s)")

    def delete(self, key: str) -> bool:
        """Remove a key from cache. Returns True if the key existed."""
        if key in self._store:
            del self._store[key]
            return True
        return False

    def clear(self) -> None:
        """Clear all cached entries."""
        count = len(self._store)
        self._store.clear()
        logger.info(f"Cache cleared: {count} entries removed")

    def cleanup_expired(self) -> int:
        """Remove all expired entries. Returns count of removed entries."""
        now = time.time()
        expired_keys = [
            key for key, (_, expires_at) in self._store.items()
            if now > expires_at
        ]
        for key in expired_keys:
            del self._store[key]
        if expired_keys:
            logger.info(f"Cache cleanup: {len(expired_keys)} expired entries removed")
        return len(expired_keys)

    @property
    def stats(self) -> dict:
        """Return cache statistics."""
        return {
            "entries": len(self._store),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": (
                round(self._hits / (self._hits + self._misses), 3)
                if (self._hits + self._misses) > 0
                else 0
            ),
        }

    def __len__(self) -> int:
        return len(self._store)


# Module-level singleton — used by the Qloo client and resolution modules
cache = MemoryCache()
