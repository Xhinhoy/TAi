# ==================== app/services/llm/tools.py ====================
from langchain.tools import BaseTool
from app.services.external.google_places import GooglePlacesFacade
import json
from math import radians, sin, cos, sqrt, asin


# ============================================================
# 🔍 SearchPlacesTool — devuelve texto legible para el chat
# ============================================================
class SearchPlacesTool(BaseTool):
    name: str = "search_places"
    description: str = (
        "Busca lugares turísticos usando Google Places API. "
        "Ejemplo: 'museos en Santiago' o 'restaurantes cerca de Providencia'."
    )

    def _run(self, *args, input: str | dict | None = None, **kwargs) -> str:
        try:
            if args and not input:
                input = args[0]

            # 🔹 Extraer la query
            if isinstance(input, dict):
                query = input.get("query") or input.get("input") or ""
            elif kwargs:
                query = kwargs.get("query") or kwargs.get("input") or ""
            else:
                query = str(input or "")

            if not query:
                return "Por favor, indica qué tipo de lugar deseas buscar."

            facade = GooglePlacesFacade()
            results = facade.text_search(query)

            if not results:
                return f"No se encontraron lugares para '{query}'."

            # 🔹 Armar respuesta clara para el chat
            response_lines = [f"Encontré algunos lugares que podrían interesarte en base a '{query}':\n"]
            for i, p in enumerate(results[:5]):
                name = p.get("name", "Lugar sin nombre")
                address = p.get("address", "Dirección no disponible")
                rating = p.get("rating", "Sin calificación")
                response_lines.append(f"{i+1}. {name} — {address} (⭐ {rating})")

            return "\n".join(response_lines)

        except Exception as e:
            return f"⚠️ Error al buscar lugares: {str(e)}"

    async def _arun(self, *args, input: str | dict | None = None, **kwargs) -> str:
        return self._run(*args, input=input, **kwargs)


# ============================================================
# 🏛 GetPlaceDetailsTool — obtiene detalles de un lugar
# ============================================================
class GetPlaceDetailsTool(BaseTool):
    name: str = "get_place_details"
    description: str = (
        "Obtiene detalles completos de un lugar específico. "
        "Input: ID o nombre del lugar."
    )

    def _run(self, *args, input: str | dict | None = None, **kwargs) -> str:
        try:
            if args and not input:
                input = args[0]

            place_identifier = ""
            if isinstance(input, dict):
                place_identifier = input.get("place_id") or input.get("name") or input.get("input") or ""
            elif kwargs:
                place_identifier = kwargs.get("place_id") or kwargs.get("name") or kwargs.get("input") or ""
            else:
                place_identifier = str(input or "")

            if not place_identifier:
                return "No se proporcionó identificador de lugar."

            facade = GooglePlacesFacade()
            details = (
                facade.get_place_details(place_identifier)
                if place_identifier.startswith("ChIJ")
                else facade.text_search(place_identifier)
            )

            return json.dumps(details[0] if isinstance(details, list) else details)

        except Exception as e:
            return f"Error al obtener detalles: {str(e)}"

    async def _arun(self, *args, input: str | dict | None = None, **kwargs) -> str:
        return self._run(*args, input=input, **kwargs)


# ============================================================
# 🎯 FilterPlacesByInterestsTool — evita loops vacíos
# ============================================================
class FilterPlacesByInterestsTool(BaseTool):
    name: str = "filter_by_interests"
    description: str = (
        "Filtra y rankea lugares según intereses del usuario. "
        "Input: JSON o dict con {'places': [...], 'interests': ['museos','parques',...]}"
    )

    def _run(self, *args, input: str | dict | None = None, **kwargs) -> str:
        try:
            if args and not input:
                input = args[0]
            if isinstance(input, dict):
                data = {**input, **kwargs}
            elif kwargs:
                data = kwargs
            else:
                try:
                    data = json.loads(input or "{}")
                except Exception:
                    data = {}

            places = data.get("places", [])
            user_interests = data.get("interests", [])

            if not places or not isinstance(places, list):
                return json.dumps([])

            interest_map = {
                'museos': ['museum', 'art_gallery'],
                'monumentos': ['monument', 'landmark'],
                'parques': ['park', 'nature'],
                'restaurantes': ['restaurant', 'food'],
                'bares': ['bar', 'night_club'],
                'senderismo': ['hiking', 'mountain'],
                'vida-nocturna': ['night_club', 'bar'],
                'compras': ['shopping_mall', 'store'],
            }

            relevant_categories = {
                cat for i in user_interests for cat in interest_map.get(i.lower(), [])
            }

            scored = []
            for place in places:
                if isinstance(place, str):
                    name = place
                    cats = []
                else:
                    name = place.get("name", "")
                    cats = place.get("categories", [])
                score = sum(c in relevant_categories for c in cats)
                if score > 0:
                    scored.append({"name": name, "score": score})

            # Si no encontró coincidencias, devolvemos todos los lugares originales
            if not scored:
                scored = [{"name": p if isinstance(p, str) else p.get("name")} for p in places]

            return json.dumps(scored[:5])

        except Exception as e:
            return json.dumps({"error": str(e)})

    async def _arun(self, *args, input: str | dict | None = None, **kwargs) -> str:
        return self._run(*args, input=input, **kwargs)


# ============================================================
# 🗺 OptimizeRouteTool — ordena por distancia
# ============================================================
class OptimizeRouteTool(BaseTool):
    name: str = "optimize_route"
    description: str = (
        "Optimiza el orden de visitas para minimizar desplazamientos. "
        "Input: JSON o dict con lugares [{name, coords:{latitude,longitude}}]"
    )

    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        return R * c

    def _run(self, *args, input: str | dict | None = None, **kwargs) -> str:
        try:
            if args and not input:
                input = args[0]
            if isinstance(input, dict):
                data = {**input, **kwargs}
            elif kwargs:
                data = kwargs
            else:
                try:
                    data = json.loads(input or "{}")
                except Exception:
                    data = {}

            places = data.get("places", data if isinstance(data, list) else [])
            if not places:
                return json.dumps([])
            if len(places) == 1:
                return json.dumps(places)

            optimized = [places[0]]
            remaining = places[1:]

            while remaining:
                last = optimized[-1]
                last_coords = last.get("coords", {})
                if not last_coords:
                    break

                closest = min(
                    remaining,
                    key=lambda p: self._haversine_distance(
                        last_coords.get("latitude", 0),
                        last_coords.get("longitude", 0),
                        p["coords"]["latitude"],
                        p["coords"]["longitude"],
                    ),
                )

                optimized.append(closest)
                remaining.remove(closest)

            return json.dumps(optimized)
        except Exception as e:
            return json.dumps({"error": str(e)})

    async def _arun(self, *args, input: str | dict | None = None, **kwargs) -> str:
        return self._run(*args, input=input, **kwargs)
