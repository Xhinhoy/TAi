import os
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest


os.environ.setdefault("MOCK_MODE", "true")
os.environ.setdefault("FIREBASE_CREDENTIALS_PATH", "dummy")
os.environ.setdefault("FIREBASE_PROJECT_ID", "dummy")
os.environ.setdefault("FIREBASE_DATABASE_URL", "https://dummy.local")

PROJECT_ROOT = Path(__file__).resolve().parents[5]
BACKEND_SRC = PROJECT_ROOT / "src" / "backend"
if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))

VENV_SITE_PACKAGES = BACKEND_SRC / "venv" / "Lib" / "site-packages"
if VENV_SITE_PACKAGES.exists() and str(VENV_SITE_PACKAGES) not in sys.path:
    sys.path.insert(0, str(VENV_SITE_PACKAGES))

if "googlemaps" not in sys.modules:
    googlemaps_stub = ModuleType("googlemaps")
    googlemaps_stub.Client = lambda *args, **kwargs: None
    sys.modules["googlemaps"] = googlemaps_stub

class DummySecret:
    def __init__(self, value: str):
        self._value = value

    def get_secret_value(self) -> str:
        return self._value


config_module = ModuleType("app.core.config")
config_module.settings = SimpleNamespace(
    GOOGLE_PLACES_API_KEY=DummySecret("test-key"),
    GOOGLE_PLACES_RATE_LIMIT=60,
)
config_module.__package__ = "app.core"
sys.modules["app.core.config"] = config_module

cache_stub_module = ModuleType("app.utils.cache")


class _InitialCache:
    def get(self, *args, **kwargs):
        return None

    def set(self, *args, **kwargs):
        return True

    def delete(self, *args, **kwargs):
        return True

    def clear_prefix(self, *args, **kwargs):
        return True


cache_stub_module.firebase_cache = _InitialCache()
cache_stub_module.__package__ = "app.utils"
sys.modules["app.utils.cache"] = cache_stub_module

import app.services.external.google_places as google_places
from app.services.external.google_places import GooglePlacesFacade


class DummyCache:
    def __init__(self):
        self.store = {}

    def get(self, prefix, key):
        return self.store.get((prefix, key))

    def set(self, prefix, key, value, ttl=None):
        self.store[(prefix, key)] = value
        return True

    def delete(self, prefix, key):
        return self.store.pop((prefix, key), None) is not None


class DummyMapsClient:
    def __init__(self):
        self.nearby_response = {}
        self.place_response = {}
        self.calls = {"places_nearby": [], "place": []}

    def places_nearby(self, **kwargs):
        self.calls["places_nearby"].append(kwargs)
        return self.nearby_response

    def place(self, place_id):
        self.calls["place"].append(place_id)
        return self.place_response


@pytest.fixture
def facade(monkeypatch):
    dummy_client = DummyMapsClient()
    monkeypatch.setattr(
        google_places,
        "googlemaps",
        SimpleNamespace(Client=lambda key=None: dummy_client),
    )
    cache = DummyCache()
    monkeypatch.setattr(google_places, "firebase_cache", cache)
    facade = GooglePlacesFacade()
    return facade, dummy_client, cache


def test_search_nearby_formats_results(facade):
    facade_instance, client, cache = facade

    client.nearby_response = {
        "results": [
            {
                "place_id": "abc123",
                "name": "Café Central",
                "vicinity": "Calle Falsa 123",
                "geometry": {"location": {"lat": 40.0, "lng": -3.7}},
                "rating": 4.2,
                "price_level": 2,
                "types": ["cafe", "food"],
                "photos": [{"photo_reference": "photo-token"}],
                "opening_hours": {"open_now": True, "weekday_text": ["Mon: 8-18"]},
            }
        ]
    }

    results = facade_instance.search_nearby({"latitude": 40.0, "longitude": -3.7})

    assert len(results) == 1
    place = results[0]
    assert place["id"] == "abc123"
    assert place["coords"] == {"latitude": 40.0, "longitude": -3.7}
    assert place["photos"] == [
        "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=photo-token&key=test-key"
    ]
    assert place["source"] == "google"
    assert cache.store  # datos en caché


def test_get_place_details_formats_full_payload(facade):
    facade_instance, client, cache = facade

    client.place_response = {
        "result": {
            "place_id": "def456",
            "name": "Museo de Arte",
            "formatted_address": "Av. Principal 456",
            "geometry": {"location": {"lat": 41.1, "lng": -2.9}},
            "rating": 4.8,
            "price_level": 3,
            "types": ["museum", "tourist_attraction"],
            "photos": [{"photo_reference": "detail-photo"}],
            "opening_hours": {"open_now": False, "weekday_text": ["Tue: 10-20"]},
            "formatted_phone_number": "+34 600 000 000",
            "website": "https://museo.example.com",
            "user_ratings_total": 250,
            "reviews": [
                {
                    "author_name": "Ana",
                    "rating": 5,
                    "text": "Excelente",
                    "relative_time_description": "hace 1 día",
                }
            ],
        }
    }

    details = facade_instance.get_place_details("def456")

    assert details is not None
    assert details["id"] == "def456"
    assert details["coords"] == {"latitude": 41.1, "longitude": -2.9}
    assert details["phone"] == "+34 600 000 000"
    assert details["website"] == "https://museo.example.com"
    assert details["reviews_count"] == 250
    assert details["reviews"][0]["author_name"] == "Ana"
    assert cache.get(facade_instance.cache_prefix, "details_def456") == details
