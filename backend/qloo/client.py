"""
Qloo API Client — The ONLY module that talks to Qloo.

Handles:
- Authentication (API key header)
- Base URL configuration
- Timeouts and retries with exponential backoff
- Rate-limit detection (429)
- Response normalization into internal objects
- Data-source labeling (live vs cached)
"""

import hashlib
import json
import logging
from typing import Optional

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from backend.config import settings
from backend.cache.memory_cache import cache
from backend.models.candidates import DataSource

logger = logging.getLogger(__name__)


class QlooAPIError(Exception):
    """Raised when the Qloo API returns an error."""
    def __init__(self, status_code: int, message: str, detail: Optional[dict] = None):
        self.status_code = status_code
        self.message = message
        self.detail = detail
        super().__init__(f"Qloo API error {status_code}: {message}")


class QlooRateLimitError(QlooAPIError):
    """Raised when the Qloo API returns 429 Too Many Requests."""
    pass


class QlooClient:
    """
    Async client for the Qloo API.
    
    This is the single point of contact with Qloo. All other modules
    go through this client.
    """

    # Known entity type mappings
    ENTITY_TYPES = {
        "movies": "movies",
        "restaurants": "restaurants",
        "activities": "activities",
        "music": "music",
        "tv_shows": "tv-shows",
        "books": "books",
        "podcasts": "podcasts",
    }

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=settings.qloo_base_url,
                headers={
                    "Authorization": f"Bearer {settings.qloo_api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                timeout=httpx.Timeout(
                    connect=settings.qloo_timeout_connect,
                    read=settings.qloo_timeout_read,
                    write=10.0,
                    pool=10.0,
                ),
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _cache_key(self, endpoint: str, params: dict) -> str:
        """Generate a deterministic cache key from the request."""
        raw = json.dumps({"endpoint": endpoint, "params": params}, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()

    async def _handle_response(self, response: httpx.Response) -> dict:
        """Handle API response, raising appropriate errors."""
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After", "unknown")
            raise QlooRateLimitError(
                status_code=429,
                message=f"Rate limited. Retry after: {retry_after}",
                detail={"retry_after": retry_after},
            )

        if response.status_code >= 400:
            try:
                error_body = response.json()
            except Exception:
                error_body = {"raw": response.text}
            raise QlooAPIError(
                status_code=response.status_code,
                message=f"API returned {response.status_code}",
                detail=error_body,
            )

        return response.json()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.TransportError, QlooRateLimitError)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    async def search(
        self,
        query: str,
        entity_type: Optional[str] = None,
        limit: int = 5,
    ) -> list[dict]:
        """
        Search for entities matching a query.

        Args:
            query: Search text (e.g., "Spirited Away", "Italian restaurants")
            entity_type: Optional entity type filter (e.g., "movies", "restaurants")
            limit: Max results to return

        Returns:
            List of normalized entity dicts with: id, name, type, tags, properties
        """
        params = {
            "query": query,
            "limit": limit,
        }
        if entity_type:
            mapped_type = self.ENTITY_TYPES.get(entity_type, entity_type)
            params["type"] = mapped_type

        # Check cache
        cache_key = self._cache_key("/search", params)
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(f"Cache hit for search: {query}")
            return [
                {**entity, "_data_source": DataSource.CACHED_QLOO}
                for entity in cached
            ]

        # Make the API call
        client = await self._get_client()
        logger.info(f"Qloo search: query='{query}', type={entity_type}, limit={limit}")

        response = await client.get("/search", params=params)
        data = await self._handle_response(response)

        # Normalize results
        results = self._normalize_search_results(data, entity_type)

        # Cache the results
        cache.set(cache_key, results)

        return [{**entity, "_data_source": DataSource.LIVE_QLOO} for entity in results]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.TransportError, QlooRateLimitError)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    async def get_insights(
        self,
        signal_ids: list[str],
        entity_type: str,
        limit: int = 25,
        location: Optional[str] = None,
        filters: Optional[dict] = None,
    ) -> list[dict]:
        """
        Get taste-based recommendations from Qloo Insights.

        Args:
            signal_ids: List of Qloo entity IDs to use as taste signals
            entity_type: Type of entities to recommend (e.g., "movies", "restaurants")
            limit: Max results to return
            location: Optional location filter for place-based queries
            filters: Optional additional filters

        Returns:
            List of normalized entity dicts with affinity scores
        """
        mapped_type = self.ENTITY_TYPES.get(entity_type, entity_type)

        payload: dict = {
            "signals": [{"id": sid} for sid in signal_ids],
            "type": mapped_type,
            "limit": limit,
        }

        if location:
            payload["location"] = location

        if filters:
            payload.update(filters)

        # Check cache
        cache_key = self._cache_key("/v2/insights", payload)
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(f"Cache hit for insights: {len(signal_ids)} signals")
            return [
                {**entity, "_data_source": DataSource.CACHED_QLOO}
                for entity in cached
            ]

        # Make the API call
        client = await self._get_client()
        logger.info(
            f"Qloo insights: {len(signal_ids)} signals, type={entity_type}, limit={limit}"
        )

        response = await client.post("/v2/insights", json=payload)
        data = await self._handle_response(response)

        # Normalize results
        results = self._normalize_insights_results(data, entity_type)

        # Cache the results
        cache.set(cache_key, results)

        return [{**entity, "_data_source": DataSource.LIVE_QLOO} for entity in results]

    def _normalize_search_results(self, raw_data: dict, entity_type: Optional[str]) -> list[dict]:
        """
        Normalize Qloo search response into internal format.
        
        Adapts to the actual API response structure. This method should be
        updated after Phase 0 verification with real responses.
        """
        results = []
        # Try common response shapes
        items = raw_data if isinstance(raw_data, list) else raw_data.get("results", raw_data.get("data", raw_data.get("items", [])))

        if isinstance(items, dict):
            items = [items]

        for item in items:
            if not isinstance(item, dict):
                continue
            normalized = {
                "id": item.get("id", item.get("entity_id", "")),
                "name": item.get("name", item.get("title", "")),
                "type": item.get("type", item.get("entity_type", entity_type or "unknown")),
                "tags": self._extract_tags(item),
                "properties": self._extract_properties(item),
            }
            if normalized["id"] and normalized["name"]:
                results.append(normalized)

        return results

    def _normalize_insights_results(self, raw_data: dict, entity_type: str) -> list[dict]:
        """
        Normalize Qloo insights response into internal format.
        
        Extracts affinity scores and entity details.
        """
        results = []
        items = raw_data if isinstance(raw_data, list) else raw_data.get("results", raw_data.get("data", raw_data.get("items", [])))

        if isinstance(items, dict):
            items = [items]

        for rank, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            normalized = {
                "id": item.get("id", item.get("entity_id", "")),
                "name": item.get("name", item.get("title", "")),
                "type": item.get("type", item.get("entity_type", entity_type)),
                "tags": self._extract_tags(item),
                "properties": self._extract_properties(item),
                "affinity": item.get("affinity", item.get("score", item.get("relevance", None))),
                "rank": rank,
            }
            if normalized["id"] and normalized["name"]:
                results.append(normalized)

        return results

    @staticmethod
    def _extract_tags(item: dict) -> list[str]:
        """Extract tags/genres from various possible field names."""
        tags = []
        for key in ["tags", "genres", "categories", "keywords"]:
            val = item.get(key, [])
            if isinstance(val, list):
                for t in val:
                    if isinstance(t, str):
                        tags.append(t)
                    elif isinstance(t, dict):
                        tags.append(t.get("name", t.get("label", str(t))))
            elif isinstance(val, str):
                tags.append(val)
        return list(dict.fromkeys(tags))  # Dedupe while preserving order

    @staticmethod
    def _extract_properties(item: dict) -> dict:
        """Extract useful properties from the entity."""
        props = {}
        property_keys = [
            "location", "address", "price_level", "price", "rating",
            "runtime", "year", "release_date", "cuisine", "neighborhood",
            "image", "image_url", "thumbnail", "description", "url",
            "latitude", "longitude", "city", "country",
        ]
        for key in property_keys:
            if key in item and item[key] is not None:
                props[key] = item[key]

        # Check nested properties
        if "properties" in item and isinstance(item["properties"], dict):
            props.update(item["properties"])

        return props

    async def health_check(self) -> dict:
        """Check if the Qloo API is reachable and authenticated."""
        try:
            client = await self._get_client()
            # Try a minimal search to verify auth
            response = await client.get("/search", params={"query": "test", "limit": 1})
            return {
                "status": "healthy",
                "status_code": response.status_code,
                "authenticated": response.status_code != 401,
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "authenticated": False,
            }


# Module-level singleton
_qloo_client: Optional[QlooClient] = None


def get_qloo_client() -> QlooClient:
    """Get the singleton Qloo client instance."""
    global _qloo_client
    if _qloo_client is None:
        _qloo_client = QlooClient()
    return _qloo_client
