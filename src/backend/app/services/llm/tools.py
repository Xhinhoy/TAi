# ==================== app/services/llm/tools.py ====================
from langchain.tools import BaseTool
from app.services.external.google_places import GooglePlacesFacade
import json
from math import radians, sin, cos, sqrt, asin


# ============================================================
#  SearchPlacesTool — devuelve texto legible para el chat
# ============================================================
class SearchPlacesTool(BaseTool):
    name: str = "search_places"
    description: str = (
        "Busca lugares turísticos usando Google Places API. "
        "Ejemplo: 'museos en Santiago' o 'restaurantes cerca de Providencia'."
    )

    def _run(self, *args, input: str | dict | None = None, **kwargs) -> str:
        """
        Devuelve resultados tanto en texto legible como en JSON embebido,
        para que el LLM pueda parsearlos correctamente.
        """
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

            # 🔹 Normalizar los primeros 5 resultados
            formatted = []
            for p in results[:5]:
                formatted.append({
                    "name": p.get("name", "Lugar sin nombre"),
                    "address": p.get("address", "Dirección no disponible"),
                    "rating": p.get("rating", "Sin calificación"),
                })

            # 🔹 Construir respuesta doble: texto + JSON
            response_lines = [
                f"Encontré algunos lugares que podrían interesarte en base a '{query}':"
            ]
            for i, p in enumerate(formatted, start=1):
                response_lines.append(f"{i}. {p['name']} — {p['address']} (⭐ {p['rating']})")

            response_text = "\n".join(response_lines)
            response_json = json.dumps(formatted, ensure_ascii=False)

            # 🔹 Enviar ambos formatos: el LLM podrá usar el JSON
            return f"{response_text}\n\nJSON_RESULT={response_json}"

        except Exception as e:
            return f"⚠️ Error al buscar lugares: {str(e)}"


    async def _arun(self, *args, input: str | dict | None = None, **kwargs) -> str:
        return self._run(*args, input=input, **kwargs)


# ============================================================
#  GetPlaceDetailsTool — obtiene detalles de un lugar
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
#  FilterPlacesByInterestsTool — evita loops vacíos
# ============================================================
class FilterPlacesByInterestsTool(BaseTool):
    name: str = "filter_by_interests"
    description: str = (
        "Filtra y prioriza lugares según los intereses del usuario. "
        "Recibe un input JSON o dict con {'places': [...], 'interests': ['museos', 'parques', ...]} y devuelve los lugares relevantes."
    )

    def _run(self, *args, input: str | dict | None = None, **kwargs) -> str:
        try:
            # --- 1️⃣ Parseo flexible del input ---
            if args and not input:
                input = args[0]
            if isinstance(input, dict):
                data = input
            elif isinstance(input, str):
                try:
                    data = json.loads(input)
                except Exception:
                    data = {}
            else:
                data = kwargs or {}

            places = data.get("places", [])
            user_interests = [i.lower() for i in data.get("interests", [])]

            if not places or not user_interests:
                return json.dumps([])

            # --- 2️⃣ Diccionario de intereses -> palabras clave ---
            keywords_map = {
                "museos": ["museo", "museum", "galería", "arte", "historia"],
                "monumentos": ["monumento", "plaza", "palacio", "histórico"],
                "parques": ["parque", "jardín", "botánico", "verde", "naturaleza"],
                "restaurantes": ["restaurant", "comida", "gastronomía", "chef"],
                "bares": ["bar", "pub", "cerveza", "tragos", "nocturno"],
                "compras": ["tienda", "shopping", "mercado", "mall"],
            }

            # --- 3️⃣ Procesamiento de lugares ---
            resultados = []
            for p in places:
                nombre = p.get("name", "").lower()
                direccion = p.get("address", "").lower()
                rating = float(p.get("rating", 0))
                texto = f"{nombre} {direccion}"

                # puntuación base
                score = 0
                for i in user_interests:
                    palabras = keywords_map.get(i, [i])
                    score += sum(1 for palabra in palabras if palabra in texto)

                # boost por rating alto
                score += rating / 5.0

                if score > 0:
                    resultados.append({**p, "match_score": round(score, 2)})

            # --- 4️⃣ Ordenar por relevancia ---
            resultados.sort(key=lambda x: x["match_score"], reverse=True)

            # --- 5️⃣ Devolver máximo 5 lugares ---
            return json.dumps(resultados[:5], ensure_ascii=False)

        except Exception as e:
            return json.dumps({"error": str(e)})

    async def _arun(self, *args, input: str | dict | None = None, **kwargs) -> str:
        return self._run(*args, input=input, **kwargs)


# ============================================================
#  OptimizeRouteTool — ordena por distancia
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
