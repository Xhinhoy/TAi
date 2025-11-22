"""
LangChain Tools para el Alert Generator Agent

Estas tools permiten que Gemini orqueste la búsqueda de lugares
usando Google Places y TripAdvisor de forma inteligente.
"""

from langchain.tools import BaseTool
from typing import Optional, Type, List, Dict, Any
from pydantic import BaseModel, Field
import logging

from app.services.external.google_places import google_places_facade
from app.services.external.tripadvisor import tripadvisor_facade
from app.repositories.user_repository import user_repository

logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class SearchNearbyInput(BaseModel):
    """Input para buscar lugares cercanos"""
    latitude: float = Field(description="Latitud de la ubicación actual")
    longitude: float = Field(description="Longitud de la ubicación actual")
    radius: int = Field(default=500, description="Radio de búsqueda en metros (default: 500)")
    place_type: Optional[str] = Field(default=None, description="Tipo de lugar (restaurant, museum, park, etc.)")
    keyword: Optional[str] = Field(default=None, description="Palabra clave para filtrar (opcional)")


class GetPlaceDetailsInput(BaseModel):
    """Input para obtener detalles de un lugar"""
    place_id: str = Field(description="ID del lugar de Google Places")


class SearchTripAdvisorInput(BaseModel):
    """Input para buscar en TripAdvisor"""
    place_name: str = Field(description="Nombre del lugar a buscar")
    latitude: float = Field(description="Latitud del lugar")
    longitude: float = Field(description="Longitud del lugar")


class GetTripAdvisorReviewsInput(BaseModel):
    """Input para obtener reviews de TripAdvisor"""
    location_id: str = Field(description="ID del lugar en TripAdvisor")
    limit: int = Field(default=5, description="Número máximo de reviews (default: 5)")


class GetUserProfileInput(BaseModel):
    """Input para obtener perfil de usuario"""
    user_id: str = Field(description="ID del usuario")


# ==================== TOOLS ====================

class GooglePlacesSearchTool(BaseTool):
    """Tool para buscar lugares cercanos usando Google Places API"""

    name: str = "google_places_search"
    description: str = """
    Busca lugares cercanos a una ubicación usando Google Places API.
    Retorna lista de lugares con nombre, rating, dirección, precio, fotos y categorías.

    Úsala cuando necesites:
    - Encontrar lugares cerca de la ubicación actual del usuario
    - Buscar tipos específicos (restaurantes, museos, parques)
    - Filtrar por palabras clave

    Ejemplo: Buscar restaurantes en un radio de 500m
    """
    args_schema: Type[BaseModel] = SearchNearbyInput

    def _run(
        self,
        latitude: float,
        longitude: float,
        radius: int = 500,
        place_type: Optional[str] = None,
        keyword: Optional[str] = None
    ) -> str:
        """Ejecuta búsqueda en Google Places"""
        try:
            logger.info(f"🔍 Google Places Search: ({latitude}, {longitude}), r={radius}m, type={place_type}")

            results = google_places_facade.search_nearby(
                location={'latitude': latitude, 'longitude': longitude},
                radius=radius,
                place_type=place_type,
                keyword=keyword
            )

            if not results:
                return "No se encontraron lugares cercanos."

            # Formatear resultados para el LLM
            summary = f"Encontrados {len(results)} lugares:\n\n"

            for i, place in enumerate(results[:5], 1):  # Limitar a 5 para no saturar el context
                summary += f"{i}. {place['name']}\n"
                summary += f"   - Rating: {place.get('rating', 'N/A')}/5\n"
                summary += f"   - Precio: {'$' * (place.get('price_level', 0) + 1) if place.get('price_level') else 'N/A'}\n"
                summary += f"   - Dirección: {place.get('address', 'N/A')}\n"
                summary += f"   - Categorías: {', '.join(place.get('categories', [])[:3])}\n"
                summary += f"   - ID: {place['id']}\n\n"

            logger.info(f"✅ Encontrados {len(results)} lugares")
            return summary

        except Exception as e:
            logger.error(f"❌ Error en Google Places Search: {str(e)}")
            return f"Error buscando lugares: {str(e)}"

    async def _arun(self, *args, **kwargs):
        """Versión async (no implementada, usa sync)"""
        return self._run(*args, **kwargs)


class GooglePlaceDetailsTool(BaseTool):
    """Tool para obtener detalles completos de un lugar"""

    name: str = "google_place_details"
    description: str = """
    Obtiene detalles completos de un lugar específico de Google Places.
    Retorna información detallada: horarios, teléfono, website, reviews.

    Úsala cuando necesites:
    - Información detallada de un lugar específico
    - Horarios de apertura
    - Reviews de Google
    - Contacto y website

    Requiere el place_id obtenido de google_places_search.
    """
    args_schema: Type[BaseModel] = GetPlaceDetailsInput

    def _run(self, place_id: str) -> str:
        """Obtiene detalles del lugar"""
        try:
            logger.info(f"📄 Google Place Details: {place_id}")

            details = google_places_facade.get_place_details(place_id)

            if not details:
                return f"No se encontraron detalles para el lugar {place_id}"

            # Formatear detalles
            summary = f"Detalles de {details['name']}:\n\n"
            summary += f"Rating: {details.get('rating', 'N/A')}/5 ({details.get('reviews_count', 0)} reviews)\n"
            summary += f"Dirección: {details.get('address', 'N/A')}\n"
            summary += f"Teléfono: {details.get('phone', 'N/A')}\n"
            summary += f"Website: {details.get('website', 'N/A')}\n\n"

            # Horarios
            opening_hours = details.get('opening_hours', {})
            if opening_hours:
                summary += f"Abierto ahora: {'Sí' if opening_hours.get('open_now') else 'No'}\n"

            # Reviews más recientes
            reviews = details.get('reviews', [])
            if reviews:
                summary += f"\nReviews recientes de Google:\n"
                for i, review in enumerate(reviews[:3], 1):
                    summary += f"{i}. {review['author']} ({review['rating']}/5): {review['text'][:100]}...\n"

            return summary

        except Exception as e:
            logger.error(f"❌ Error obteniendo detalles: {str(e)}")
            return f"Error obteniendo detalles: {str(e)}"

    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)


class TripAdvisorSearchTool(BaseTool):
    """Tool para buscar lugares en TripAdvisor"""

    name: str = "tripadvisor_search"
    description: str = """
    Busca un lugar en TripAdvisor por nombre y ubicación.
    Retorna información de TripAdvisor: ranking, número de reviews, premios.

    Úsala cuando necesites:
    - Verificar reputación en TripAdvisor
    - Obtener ranking local
    - Ver premios y reconocimientos
    - Complementar información de Google Places

    Requiere el nombre del lugar y coordenadas.
    """
    args_schema: Type[BaseModel] = SearchTripAdvisorInput

    def _run(self, place_name: str, latitude: float, longitude: float) -> str:
        """Busca lugar en TripAdvisor"""
        try:
            logger.info(f"🔍 TripAdvisor Search: {place_name}")

            results = tripadvisor_facade.search_location(
                query=place_name,
                lat=latitude,
                lng=longitude
            )

            if not results:
                return f"No se encontró '{place_name}' en TripAdvisor"

            place = results[0]  # Primer resultado

            summary = f"TripAdvisor - {place.get('name')}:\n\n"
            summary += f"Rating: {place.get('rating', 'N/A')}/5\n"
            summary += f"Número de reviews: {place.get('num_reviews', 0)}\n"
            summary += f"Ranking: {place.get('ranking', 'N/A')}\n"
            summary += f"Premios: {place.get('awards', 'Ninguno')}\n"
            summary += f"Location ID: {place.get('location_id')}\n"

            return summary

        except Exception as e:
            logger.error(f"❌ Error en TripAdvisor Search: {str(e)}")
            return f"Error buscando en TripAdvisor: {str(e)}"

    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)


class TripAdvisorReviewsTool(BaseTool):
    """Tool para obtener reviews de TripAdvisor"""

    name: str = "tripadvisor_reviews"
    description: str = """
    Obtiene reviews recientes de TripAdvisor para un lugar.
    Retorna opiniones de viajeros reales con fechas y ratings.

    Úsala cuando necesites:
    - Leer opiniones recientes de viajeros
    - Verificar experiencias actuales
    - Detectar problemas o highlights recientes
    - Complementar reviews de Google

    Requiere el location_id de TripAdvisor (obtener con tripadvisor_search).
    """
    args_schema: Type[BaseModel] = GetTripAdvisorReviewsInput

    def _run(self, location_id: str, limit: int = 5) -> str:
        """Obtiene reviews de TripAdvisor"""
        try:
            logger.info(f"📝 TripAdvisor Reviews: {location_id}")

            reviews = tripadvisor_facade.get_reviews(location_id, limit=limit)

            if not reviews:
                return f"No se encontraron reviews para location_id {location_id}"

            summary = f"Reviews recientes de TripAdvisor ({len(reviews)}):\n\n"

            for i, review in enumerate(reviews, 1):
                summary += f"{i}. Rating: {review.get('rating', 'N/A')}/5\n"
                summary += f"   Fecha: {review.get('published_date', 'N/A')}\n"
                summary += f"   Título: {review.get('title', 'Sin título')}\n"
                summary += f"   Texto: {review.get('text', '')[:150]}...\n\n"

            return summary

        except Exception as e:
            logger.error(f"❌ Error obteniendo reviews: {str(e)}")
            return f"Error obteniendo reviews: {str(e)}"

    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)


class UserProfileTool(BaseTool):
    """Tool para obtener perfil del usuario"""

    name: str = "get_user_profile"
    description: str = """
    Obtiene el perfil completo del usuario con sus preferencias.
    Retorna intereses, presupuesto, estilo de viaje, y más.

    Úsala cuando necesites:
    - Conocer los intereses del usuario
    - Verificar presupuesto
    - Entender estilo de viaje
    - Personalizar recomendaciones

    Requiere el user_id.
    """
    args_schema: Type[BaseModel] = GetUserProfileInput

    def _run(self, user_id: str) -> str:
        """Obtiene perfil del usuario"""
        try:
            logger.info(f"👤 Get User Profile: {user_id}")

            profile = user_repository.get_user_profile(user_id)

            if not profile:
                return f"No se encontró perfil para usuario {user_id}"

            summary = f"Perfil de {profile.get('display_name', 'Usuario')}:\n\n"

            # Intereses
            interests = profile.get('interests', [])
            if interests:
                summary += f"Intereses: {', '.join(interests)}\n"

            # Preferencias
            preferences = profile.get('preferences', {})
            if preferences:
                budget = preferences.get('budget', {})
                if budget:
                    summary += f"Presupuesto: ${budget.get('min', 0)}-${budget.get('max', 0)} {budget.get('currency', 'USD')}\n"

                travel_style = preferences.get('travel_style')
                if travel_style:
                    summary += f"Estilo de viaje: {travel_style}\n"

                group_size = preferences.get('group_size')
                if group_size:
                    summary += f"Viaja: {group_size}\n"

            return summary

        except Exception as e:
            logger.error(f"❌ Error obteniendo perfil: {str(e)}")
            return f"Error obteniendo perfil: {str(e)}"

    async def _arun(self, *args, **kwargs):
        return self._run(*args, **kwargs)


# ==================== TOOL LIST ====================

def get_alert_tools() -> List[BaseTool]:
    """Retorna lista de todas las tools disponibles para el Alert Agent"""
    return [
        GooglePlacesSearchTool(),
        GooglePlaceDetailsTool(),
        TripAdvisorSearchTool(),
        TripAdvisorReviewsTool(),
        UserProfileTool()
    ]
