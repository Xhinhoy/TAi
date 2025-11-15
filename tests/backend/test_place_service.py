from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict
from unittest.mock import MagicMock

import pytest


# Ensure backend modules can be imported without the real environment.
os.environ.setdefault("MOCK_MODE", "true")
os.environ.setdefault("GOOGLE_PLACES_API_KEY", "AIzaSyD-FAKEKEY1234567890abcdefghi")

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_PATH = REPO_ROOT / "src" / "backend"
if str(BACKEND_PATH) not in sys.path:
    sys.path.insert(0, str(BACKEND_PATH))


from app.models.place import GeoPoint, Place, PlaceDetails, PlaceSearchParams  # noqa: E402
from app.services.place_service import PlaceService  # noqa: E402


def _build_search_params(**overrides: Any) -> PlaceSearchParams:
    base = {
        "query": "coffee",
        "location": GeoPoint(latitude=40.0, longitude=-3.0),
        "radius": 1000,
        "place_type": "cafe",
        "categories": ["coffee", "breakfast"],
    }
    base.update(overrides)
    return PlaceSearchParams(**base)


def _raw_place(**overrides: Any) -> Dict[str, Any]:
    base = {
        "place_id": "place-123",
        "name": "Coffee Shop",
        "rating": 4.5,
        "vicinity": "123 Main St",
        "types": ["cafe", "food"],
        "location": {"lat": 40.0, "lng": -3.0},
        "photos": ["photo-url"],
    }
    base.update(overrides)
    return base


def _raw_place_details(**overrides: Any) -> Dict[str, Any]:
    base = _raw_place(
        formatted_address="123 Main St",
        formatted_phone_number="+34 555 0101",
        website="https://coffee.example",
        user_ratings_total=120,
        reviews=[{"author_name": "John", "text": "Great!"}],
    )
    base.update(overrides)
    return base


@pytest.fixture()
def mocks():
    google_facade = MagicMock()
    repository = MagicMock()
    cache = MagicMock()
    cache.get.return_value = None
    return google_facade, repository, cache


def test_search_places_maps_results_and_caches(mocks):
    google_facade, repository, cache = mocks
    google_facade.search_nearby.return_value = [_raw_place()]

    service = PlaceService(google_facade, repository, cache)
    params = _build_search_params()

    results = service.search_places(params)

    assert len(results) == 1
    assert isinstance(results[0], Place)
    repository.save_place.assert_called_once()
    cache.set.assert_called_once()
    cache_key = cache.set.call_args.args[1]
    assert cache_key == service._build_search_cache_key(params)


def test_search_places_returns_cached_results(mocks):
    google_facade, repository, cache = mocks
    cached_place = Place(
        id="cached-1",
        name="Cached Coffee",
        coords=GeoPoint(latitude=41.0, longitude=-2.0),
        rating=4.0,
        address="Plaza Mayor",
        photos=[],
    )
    cache.get.return_value = [cached_place.model_dump()]

    service = PlaceService(google_facade, repository, cache)
    params = _build_search_params()
    results = service.search_places(params)

    assert len(results) == 1
    assert results[0].id == "cached-1"
    google_facade.search_nearby.assert_not_called()
    repository.save_place.assert_not_called()


def test_get_place_details_prefers_cache(mocks):
    google_facade, repository, cache = mocks
    cached_details = PlaceDetails(
        id="place-123",
        name="Coffee Shop",
        coords=GeoPoint(latitude=40.0, longitude=-3.0),
        rating=4.5,
        address="123 Main St",
        phone="+34 555 0101",
        website="https://coffee.example",
        photos=["photo-url"],
    )
    cache.get.return_value = cached_details.model_dump()

    service = PlaceService(google_facade, repository, cache)
    result = service.get_place_details("place-123")

    assert isinstance(result, PlaceDetails)
    assert result.phone == "+34 555 0101"
    repository.get_place.assert_not_called()
    google_facade.get_place_details.assert_not_called()


def test_get_place_details_fetches_and_caches_when_missing(mocks):
    google_facade, repository, cache = mocks
    cache.get.return_value = None
    repository.get_place.return_value = None
    google_facade.get_place_details.return_value = _raw_place_details()

    service = PlaceService(google_facade, repository, cache)
    result = service.get_place_details("place-123")

    assert isinstance(result, PlaceDetails)
    repository.save_place.assert_called_once()
    cache.set.assert_called()
    # Last cache.set call corresponds to details cache
    details_call = cache.set.call_args_list[-1]
    assert details_call.args[0] == service.DETAILS_CACHE_PREFIX
    assert details_call.args[1] == "place-123"


def test_get_place_details_returns_none_on_errors(mocks):
    google_facade, repository, cache = mocks
    cache.get.return_value = None
    repository.get_place.return_value = None
    google_facade.get_place_details.side_effect = Exception("boom")

    service = PlaceService(google_facade, repository, cache)
    result = service.get_place_details("place-123")

    assert result is None

