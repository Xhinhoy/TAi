from __future__ import annotations

import hashlib
import json
import logging
from typing import List, Optional, Dict, Any

from pydantic import ValidationError

from app.models.place import Place, PlaceDetails, PlaceSearchParams, GeoPoint
from app.repositories.place_repository import place_repository
from app.services.external.google_places import google_places_facade
from app.utils.cache import firebase_cache


logger = logging.getLogger(__name__)


class PlaceService:
    """Service layer responsible for orchestrating Google Places lookups."""

    SEARCH_CACHE_PREFIX = "place_service_search"
    DETAILS_CACHE_PREFIX = "place_service_details"

    def __init__(
        self,
        google_facade=google_places_facade,
        repository=place_repository,
        cache=firebase_cache,
    ) -> None:
        self._google_facade = google_facade
        self._repository = repository
        self._cache = cache

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def search_places(self, params: PlaceSearchParams) -> List[Place]:
        """Searches places using Google Places and stores normalized results."""

        cache_key = self._build_search_cache_key(params)
        cached_results = self._cache.get(self.SEARCH_CACHE_PREFIX, cache_key)
        if cached_results:
            return self._deserialize_places(cached_results)

        try:
            raw_results = self._google_facade.search_nearby(
                location={
                    "latitude": params.location.latitude,
                    "longitude": params.location.longitude,
                },
                radius=params.radius,
                place_type=params.place_type,
                keyword=params.query,
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error("Error searching places: %s", exc)
            return []

        places: List[Place] = []
        for raw in raw_results or []:
            place = self._map_place(raw)
            if not place:
                continue
            places.append(place)
            try:
                self._repository.save_place(self._model_to_dict(place))
            except Exception as exc:  # pragma: no cover - repository failures shouldn't crash search
                logger.error("Error saving place %s: %s", place.id, exc)

        if places:
            self._cache.set(
                self.SEARCH_CACHE_PREFIX,
                cache_key,
                [self._model_to_dict(place) for place in places],
            )

        return places

    def get_place_details(self, place_id: str) -> Optional[PlaceDetails]:
        """Returns full details of a place with caching and normalization."""

        cache_key = place_id
        cached_details = self._cache.get(self.DETAILS_CACHE_PREFIX, cache_key)
        if cached_details:
            try:
                return PlaceDetails(**cached_details)
            except ValidationError:
                logger.warning("Invalid cached place details for %s", place_id)

        stored_place = self._repository.get_place(place_id)
        if stored_place:
            try:
                details = PlaceDetails(**stored_place)
            except ValidationError:
                details = self._map_place_details(stored_place)
            if details:
                self._cache.set(
                    self.DETAILS_CACHE_PREFIX,
                    cache_key,
                    self._model_to_dict(details),
                )
                return details

        try:
            raw_details = self._google_facade.get_place_details(place_id)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error("Error retrieving place details for %s: %s", place_id, exc)
            return None

        if not raw_details:
            return None

        details = self._map_place_details(raw_details)
        if not details:
            return None

        try:
            self._repository.save_place(self._model_to_dict(details))
        except Exception as exc:  # pragma: no cover - repository failures shouldn't crash details
            logger.error("Error saving place details %s: %s", details.id, exc)

        self._cache.set(
            self.DETAILS_CACHE_PREFIX,
            cache_key,
            self._model_to_dict(details),
        )
        return details

    def search_by_category(self, categories: List[str], limit: int = 20) -> List[Place]:
        results = self._repository.search_by_category(categories, limit)
        return self._deserialize_places(results)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _build_search_cache_key(self, params: PlaceSearchParams) -> str:
        payload = {
            "query": params.query,
            "lat": params.location.latitude,
            "lng": params.location.longitude,
            "radius": params.radius,
            "place_type": params.place_type,
            "categories": sorted(params.categories),
        }
        return hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()

    def _deserialize_places(self, data: List[Dict[str, Any]]) -> List[Place]:
        places: List[Place] = []
        for item in data or []:
            try:
                places.append(Place(**item))
            except ValidationError:
                mapped = self._map_place(item)
                if mapped:
                    places.append(mapped)
        return places

    def _map_place(self, data: Dict[str, Any]) -> Optional[Place]:
        place_id = data.get("place_id") or data.get("id")
        name = data.get("name")
        location = data.get("location") or data.get("geometry", {}).get("location", {})
        latitude = location.get("latitude") or location.get("lat")
        longitude = location.get("longitude") or location.get("lng")

        if not place_id or not name or latitude is None or longitude is None:
            return None

        try:
            coords = GeoPoint(latitude=latitude, longitude=longitude)
        except ValidationError:
            return None

        photos = data.get("photos") or []
        if photos and isinstance(photos[0], dict):
            photos = [p.get("photo_reference") for p in photos if isinstance(p, dict) and p.get("photo_reference")]

        return Place(
            id=place_id,
            name=name,
            coords=coords,
            rating=data.get("rating"),
            address=data.get("address")
            or data.get("formatted_address")
            or data.get("vicinity"),
            price_level=data.get("price_level"),
            opening_hours=data.get("opening_hours"),
            photos=photos,
            categories=data.get("types", []) or data.get("categories", []),
            source=data.get("source", "google"),
        )

    def _map_place_details(self, data: Dict[str, Any]) -> Optional[PlaceDetails]:
        base_place = self._map_place(data)
        if not base_place:
            return None

        photos = data.get("photos") or base_place.photos
        if photos and isinstance(photos[0], dict):
            photos = [
                p.get("photo_reference") or p.get("url")
                for p in photos
                if isinstance(p, dict) and (p.get("photo_reference") or p.get("url"))
            ]

        reviews = data.get("reviews") or []
        if reviews and isinstance(reviews[0], dict):
            reviews = reviews

        payload = self._model_to_dict(base_place)
        payload.update(
            {
                "phone": data.get("formatted_phone_number") or data.get("international_phone_number") or data.get("phone"),
                "website": data.get("website"),
                "opening_hours": data.get("opening_hours") or payload.get("opening_hours"),
                "photos": photos,
                "reviews_count": data.get("user_ratings_total") or data.get("reviews_count") or 0,
                "reviews": reviews,
            }
        )

        try:
            return PlaceDetails(**payload)
        except ValidationError:
            logger.warning("Invalid place details payload for %s", base_place.id)
            return None

    @staticmethod
    def _model_to_dict(model: Any) -> Dict[str, Any]:
        if hasattr(model, "model_dump"):
            return model.model_dump()  # type: ignore[no-any-return]
        return model.dict()  # type: ignore[no-any-return]


place_service = PlaceService()


