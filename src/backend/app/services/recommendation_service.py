from app.services.external.google_places import google_places_facade
from app.services.external.tripadvisor import tripadvisor_facade
from app.models.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    PlaceRecommendation
)
from app.models.place import Place
from app.services.user_service import user_service
from typing import List
import logging


logger = logging.getLogger(__name__)


class RecommendationService:
    """Genera recomendaciones basadas en intereses del usuario (Google + TripAdvisor)."""

    async def generate_recommendations(self, request: RecommendationRequest) -> RecommendationResponse:
        try:
            user_profile = user_service.get_profile(request.user_id)
            interests = getattr(user_profile, "interests", []) or []

            lat = request.location.get("latitude") if request.location else None
            lng = request.location.get("longitude") if request.location else None
            limit = request.limit or 10

            combined_results = []

            for interest in interests:
                # Buscar en ambas fuentes
                google_results = await google_places_facade.text_search(
                    query=interest,
                    location={"latitude": lat, "longitude": lng},
                    radius=5000
                )

#                tripadvisor_results = tripadvisor_facade.search_location(
#                   query=interest,
#                    lat=lat,
#                    lng=lng
#                )
                tripadvisor_results = []  # 🔧 Desactivado temporalmente

                # Etiquetar fuente
                for r in google_results:
                    r["source"] = "google"
                    r["interest_matched"] = interest
                for r in tripadvisor_results:
                    r["source"] = "tripadvisor"
                    r["interest_matched"] = interest

                combined_results.extend(google_results)
                combined_results.extend(tripadvisor_results)

            # Eliminar duplicados por nombre
            seen = set()
            unique_results = []
            for item in combined_results:
                name = item.get("name")
                if name and name not in seen:
                    seen.add(name)
                    unique_results.append(item)

            # 🔍 Filtrar resultados poco relevantes
            filtered_results = [
                r for r in unique_results
                if (r.get("rating", 0) or 0) >= 3.5  # al menos 3.5 estrellas
                and (r.get("user_ratings_total", 0) or 0) >= 20  # mínimo 20 reseñas
                and not any(word in str(r.get("types", [])).lower() for word in ["adult", "escort", "night_club"])
            ]
            if len(filtered_results) < 5:
                filtered_results = unique_results

            # Ordenar por rating (de mayor a menor)
            sorted_results = sorted(filtered_results, key=lambda x: x.get("rating", 0) or 0, reverse=True)
            top_results = sorted_results[:limit]

            # Convertir a PlaceRecommendation
            recommendations: List[PlaceRecommendation] = []
            for r in top_results:
                # --- Normalizar coordenadas ---
                location = r.get("location") or r.get("coords") or {}
                if "lat" in location and "lng" in location:
                    coords = {"latitude": location["lat"], "longitude": location["lng"]}
                else:
                    coords = {
                        "latitude": location.get("latitude") if isinstance(location, dict) else None,
                        "longitude": location.get("longitude") if isinstance(location, dict) else None,
                    }

                # --- Crear objeto Place ---
                place = Place(
                    id=r.get("place_id") or r.get("id") or "",
                    name=r.get("name"),
                    address=r.get("address") or r.get("location_string"),
                    rating=r.get("rating"),
                    source=r.get("source"),
                    coords=coords,
                    opening_hours=r.get("opening_hours", {})  # <-- nuevo campo
                )
                        
                rec = PlaceRecommendation(
                    place=place,
                    score=(r.get("rating", 0) or 0) / 5,  # normalizado 0–1
                    reasoning=f"Coincide con tu interés en '{r.get('interest_matched')}'.",
                    match_interests=[r.get("interest_matched")]
                )
                recommendations.append(rec)

            logger.info(f"✅ {len(recommendations)} recomendaciones generadas para usuario {request.user_id}")
            return RecommendationResponse(
                recommendations=recommendations,
                reasoning=f"Generadas según tus intereses: {', '.join(interests)}."
            )

        except Exception as e:
            logger.error(f"Error generando recomendaciones: {e}")
            return RecommendationResponse(
                recommendations=[],
                reasoning=f"Ocurrió un error al generar recomendaciones: {e}"
            )


recommendation_service = RecommendationService()
