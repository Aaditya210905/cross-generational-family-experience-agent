"""
Qloo API Client — The ONLY module that talks to Qloo.

Handles:
- Authentication (X-Api-Key header)
- Base URL configuration (hackathon.api.qloo.com)
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
    Async client for the Qloo Hackathon Taste AI™ API.
    
    This is the single point of contact with Qloo. All other modules
    go through this client.
    """

    # Official Qloo entity URN mappings
    ENTITY_TYPES = {
        "movies": "urn:entity:movie",
        "movie": "urn:entity:movie",
        "restaurants": "urn:entity:place",
        "restaurant": "urn:entity:place",
        "places": "urn:entity:place",
        "place": "urn:entity:place",
        "activities": "urn:entity:place",
        "activity": "urn:entity:place",
        "music": "urn:entity:artist",
        "tv_shows": "urn:entity:tv_show",
        "books": "urn:entity:book",
    }

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client with hackathon authentication."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=settings.qloo_base_url,
                headers={
                    "X-Api-Key": settings.qloo_api_key,
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
        Search for entities matching a query via GET /search.

        Args:
            query: Search text (e.g., "Spirited Away", "The Godfather")
            entity_type: Optional entity type filter (e.g., "movies", "restaurants")
            limit: Max results to return

        Returns:
            List of normalized entity dicts with: id, name, type, tags, properties
        """
        params: dict = {
            "query": query,
            "take": limit,
        }
        if entity_type:
            mapped_type = self.ENTITY_TYPES.get(entity_type, entity_type)
            params["types"] = mapped_type

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
        Get taste-based recommendations from Qloo Insights via GET /v2/insights.

        Args:
            signal_ids: List of Qloo entity IDs to use as taste signals
            entity_type: Type of entities to recommend (e.g., "movies", "restaurants")
            limit: Max results to return
            location: Optional location filter for place-based queries
            filters: Optional additional filters

        Returns:
            List of normalized entity dicts with affinity scores
        """
        if not signal_ids:
            return []

        mapped_type = self.ENTITY_TYPES.get(entity_type, entity_type)

        params: dict = {
            "filter.type": mapped_type,
            "signal.interests.entities": ",".join(signal_ids),
            "take": limit,
        }

        if location:
            params["location"] = location

        if filters:
            for k, v in filters.items():
                params[k] = v

        # Check cache
        cache_key = self._cache_key("/v2/insights", params)
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
            f"Qloo insights: {len(signal_ids)} signals, type={mapped_type}, limit={limit}"
        )

        response = await client.get("/v2/insights", params=params)
        data = await self._handle_response(response)

        # Normalize results
        results = self._normalize_insights_results(data, entity_type)

        # Cache the results
        cache.set(cache_key, results)

        return [{**entity, "_data_source": DataSource.LIVE_QLOO} for entity in results]

    def _normalize_search_results(self, raw_data: dict, entity_type: Optional[str]) -> list[dict]:
        """
        Normalize Qloo search response into internal format.
        
        Qloo /search returns: {"results": [{"name": ..., "entity_id": ..., "types": [...], "tags": [...], "properties": {...}}]}
        """
        results = []
        items = raw_data.get("results", []) if isinstance(raw_data, dict) else raw_data

        if isinstance(items, dict):
            items = [items]

        for item in items:
            if not isinstance(item, dict):
                continue
            
            eid = item.get("entity_id") or item.get("id", "")
            name = item.get("name") or item.get("title", "")
            types = item.get("types", [])
            primary_type = types[0] if (types and isinstance(types, list)) else (entity_type or "unknown")

            normalized = {
                "id": str(eid),
                "name": str(name),
                "type": str(primary_type),
                "tags": self._extract_tags(item),
                "properties": self._extract_properties(item),
                "popularity": item.get("popularity", 0.0),
            }
            if normalized["id"] and normalized["name"]:
                results.append(normalized)

        return results

    def _normalize_insights_results(self, raw_data: dict, entity_type: str) -> list[dict]:
        """
        Normalize Qloo insights response into internal format.
        
        Qloo /v2/insights returns: {"success": true, "results": {"entities": [{"name": ..., "entity_id": ..., "query": {"affinity": 0.96}, ...}]}}
        """
        results = []
        
        # Handle {results: {entities: [...]}} or {results: [...]}
        raw_results = raw_data.get("results", {}) if isinstance(raw_data, dict) else raw_data
        if isinstance(raw_results, dict):
            items = raw_results.get("entities", [])
        elif isinstance(raw_results, list):
            items = raw_results
        else:
            items = []

        for rank, item in enumerate(items):
            if not isinstance(item, dict):
                continue

            eid = item.get("entity_id") or item.get("id", "")
            name = item.get("name") or item.get("title", "")
            
            # Affinity is in item["query"]["affinity"] or top-level "affinity"
            query_meta = item.get("query")
            affinity = None
            if isinstance(query_meta, dict):
                affinity = query_meta.get("affinity")
            if affinity is None:
                affinity = item.get("affinity", item.get("score"))
            
            # If no affinity score was returned, estimate by rank position
            if affinity is None:
                affinity = max(0.1, 1.0 - (rank * 0.03))

            item_type = item.get("subtype") or item.get("type") or entity_type

            normalized = {
                "id": str(eid),
                "name": str(name),
                "type": str(item_type),
                "tags": self._extract_tags(item),
                "properties": self._extract_properties(item),
                "affinity": float(affinity),
                "rank": rank,
                "popularity": item.get("popularity", 0.0),
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
                        tag_name = t.get("name") or t.get("label") or t.get("value")
                        if tag_name:
                            tags.append(str(tag_name))
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
            "latitude", "longitude", "city", "country", "content_rating",
            "hours", "business_rating",
        ]
        for key in property_keys:
            if key in item and item[key] is not None:
                props[key] = item[key]

        # Check nested properties
        if "properties" in item and isinstance(item["properties"], dict):
            for k, v in item["properties"].items():
                if k not in props and v is not None:
                    props[k] = v

        return props

    async def health_check(self) -> dict:
        """Check if the Qloo API is reachable and authenticated."""
        try:
            client = await self._get_client()
            response = await client.get("/search", params={"query": "test", "take": 1})
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
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
