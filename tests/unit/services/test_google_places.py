import os
import sys
import types
from pathlib import Path
from typing import Any, Dict, Optional

ROOT_DIR = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT_DIR / "src" / "backend"))

os.environ.setdefault("MOCK_MODE", "true")
os.environ.setdefault("GOOGLE_PLACES_API_KEY", "dummy")

try:  # pragma: no cover - fallback si aiohttp no está instalado
    import aiohttp
except ModuleNotFoundError:  # pragma: no cover - entorno mínimo
    aiohttp_stub = types.ModuleType("aiohttp")

    class _ClientError(Exception):
        pass

    class _ClientSession:  # pragma: no cover - solo placeholder para monkeypatch
        ...

    aiohttp_stub.ClientError = _ClientError
    aiohttp_stub.ClientSession = _ClientSession
    sys.modules["aiohttp"] = aiohttp_stub
    import aiohttp

import googlemaps


class _NoopClient:
    def __init__(self, key=None, *args, **kwargs):
        self.key = key


googlemaps.Client = _NoopClient

import pytest
from app.core.config import settings
from app.services.external.google_places import GooglePlacesFacade


class DummyCache:
    def __init__(self):
        self.store: Dict[tuple[str, str], Any] = {}

    def get(self, prefix: str, key: str) -> Optional[Any]:
        return self.store.get((prefix, key))

    def set(self, prefix: str, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        self.store[(prefix, key)] = value
        return True


class DummySecret:
    def __init__(self, value: str):
        self._value = value

    def get_secret_value(self) -> str:
        return self._value


class MockResponse:
    def __init__(self, payload: Dict[str, Any]):
        self._payload = payload

    async def json(self) -> Dict[str, Any]:
        return self._payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class MockSession:
    def __init__(self, text_payload: Dict[str, Any], detail_payloads: Dict[str, Dict[str, Any]]):
        self._text_payload = text_payload
        self._detail_payloads = detail_payloads

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def get(self, url: str, params: Optional[Dict[str, Any]] = None, timeout: Optional[int] = None):
        if "textsearch" in url:
            return MockResponse(self._text_payload)

        place_id = params.get("place_id") if params else None
        if place_id in self._detail_payloads:
            return MockResponse(self._detail_payloads[place_id])

        raise aiohttp.ClientError("boom")


@pytest.mark.asyncio
async def test_text_search_aggregates_and_caches(monkeypatch):
    dummy_cache = DummyCache()
    monkeypatch.setattr("app.services.external.google_places.firebase_cache", dummy_cache, raising=False)
    monkeypatch.setattr("app.utils.cache.firebase_cache", dummy_cache, raising=False)

    # Evitamos restricciones de entorno y llamadas reales
    monkeypatch.setattr(settings, "GOOGLE_PLACES_API_KEY", DummySecret("dummy"), raising=False)
    monkeypatch.setattr("app.services.external.google_places.googlemaps.Client", lambda key: object())

    text_payload = {
        "results": [
            {
                "place_id": "place-1",
                "name": "Primer lugar",
                "formatted_address": "Calle 123",
                "opening_hours": {"open_now": False},
            },
            {
                "place_id": "place-2",
                "name": "Segundo lugar",
                "formatted_address": "Avenida 456",
                "opening_hours": {"open_now": False},
            },
        ]
    }

    detail_payloads = {
        "place-1": {
            "result": {
                "rating": 4.7,
                "price_level": 2,
                "geometry": {"location": {"lat": 1.0, "lng": 2.0}},
                "opening_hours": {
                    "open_now": True,
                    "weekday_text": ["Lunes: 9:00 – 18:00"],
                },
                "photos": [{"photo_reference": "abc"}],
            }
        }
    }

    session = MockSession(text_payload, detail_payloads)
    monkeypatch.setattr("aiohttp.ClientSession", lambda: session)

    facade = GooglePlacesFacade()
    facade.api_key = "dummy"
    monkeypatch.setattr(facade, "_rate_limit_check", lambda: None)

    results = await facade.text_search("cafeteria", {"latitude": 1.0, "longitude": 2.0})

    assert len(results) == 2

    first, second = results

    assert first["id"] == "place-1"
    assert first["opening_hours"] == {
        "open_now": True,
        "weekday_text": ["Lunes: 9:00 – 18:00"],
    }
    assert first["location"] == {"lat": 1.0, "lng": 2.0}
    assert first["photos"] == [
        "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=abc&key=dummy"
    ]

    assert second["id"] == "place-2"
    assert second["opening_hours"] == {
        "open_now": False,
        "weekday_text": [],
    }

    cache_key = "text_search_cafeteria_1.0_2.0"
    cached = dummy_cache.get("google_places", cache_key)
    assert cached == results


def test_normalize_opening_hours_handles_missing_weekday():
    assert GooglePlacesFacade._normalize_opening_hours({"open_now": True}) == {
        "open_now": True,
        "weekday_text": [],
    }
    assert GooglePlacesFacade._normalize_opening_hours(None) is None
