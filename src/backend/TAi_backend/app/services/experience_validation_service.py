from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from app.core.config import settings
from app.services.external.google_places import GooglePlacesFacade
from app.services.external.tripadvisor import tripadvisor_facade
from app.services.llm.prompts import (
    SCREENSHOT_QUALITY_CHECK_PROMPT,
    PLACE_IDENTIFICATION_PROMPT,
    EXPERIENCE_ANALYSIS_PROMPT
)
from app.models.experience_validation import (
    ScreenshotQualityCheck,
    PlaceIdentification,
    ExperienceValidationResponse,
    Analisis,
    Alternativa,
    FuentesConsultadas
)
from app.utils.validation_cache import validation_cache
from app.utils.image_hash import generate_image_hash, get_image_info
import base64
import json
import logging
import asyncio
from typing import Optional
import time

logger = logging.getLogger(__name__)

class ExperienceValidationService:
    """Servicio para validar experiencias desde screenshots de redes sociales"""

    def __init__(self):
        # LLM para análisis rápido (Flash)
        self.llm_flash = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
            max_tokens=4000
        )

        # LLM para análisis profundo (mismo modelo configurado)
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GOOGLE_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.5,
            max_tokens=8000
        )

        self.google_places = GooglePlacesFacade
        self.tripadvisor = tripadvisor_facade

        logger.info("ExperienceValidationService inicializado")

    async def validate_screenshot_quality(self, image_bytes: bytes) -> ScreenshotQualityCheck:
        """
        Pre-validación: verifica que el screenshot tenga información suficiente
        Usa Gemini Flash para ser rápido y barato
        """
        try:
            logger.info("🔍 Validando calidad del screenshot...")

            # Convertir a base64
            image_b64 = base64.b64encode(image_bytes).decode()

            # Crear mensaje con imagen
            message = HumanMessage(
                content=[
                    {"type": "text", "text": SCREENSHOT_QUALITY_CHECK_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": f"data:image/jpeg;base64,{image_b64}"
                    }
                ]
            )

            # Invocar Gemini
            response = await self.llm_flash.ainvoke([message])

            # Parsear respuesta
            response_text = self._extract_text_content(response.content)
            result_json = self._extract_json(response_text)

            quality_check = ScreenshotQualityCheck(**result_json)

            logger.info(f"✅ Calidad validada: válido={quality_check.es_valido}, confianza={quality_check.confianza_extraccion}")

            return quality_check

        except Exception as e:
            logger.error(f"❌ Error validando calidad del screenshot: {str(e)}")
            # Retornar un resultado por defecto que permita continuar
            return ScreenshotQualityCheck(
                es_valido=True,
                tiene_imagen_lugar=True,
                tiene_texto_descripcion=False,
                tiene_ubicacion_visible=False,
                tiene_nombre_visible=False,
                plataforma_detectada="desconocida",
                confianza_extraccion=40,
                problemas=["No se pudo validar automáticamente la calidad"],
                sugerencia="Continúa con el análisis pero la precisión puede ser menor"
            )

    async def identify_place_from_screenshot(self, image_bytes: bytes) -> PlaceIdentification:
        """
        Identifica el lugar desde el screenshot usando Gemini Vision
        """
        try:
            logger.info("🔎 Identificando lugar desde screenshot...")

            # Convertir a base64
            image_b64 = base64.b64encode(image_bytes).decode()

            # Crear mensaje con imagen
            message = HumanMessage(
                content=[
                    {"type": "text", "text": PLACE_IDENTIFICATION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": f"data:image/jpeg;base64,{image_b64}"
                    }
                ]
            )

            # Invocar Gemini
            response = await self.llm.ainvoke([message])

            # Parsear respuesta
            response_text = self._extract_text_content(response.content)
            result_json = self._extract_json(response_text)

            place_info = PlaceIdentification(**result_json)

            logger.info(f"✅ Lugar identificado: {place_info.nombre} (confianza: {place_info.confianza_identificacion}%)")

            return place_info

        except Exception as e:
            logger.error(f"❌ Error identificando lugar: {str(e)}")
            raise

    async def search_place_in_google(self, place_info: PlaceIdentification) -> Optional[dict]:
        """
        Busca el lugar en Google Places usando el query generado por Gemini
        """
        try:
            logger.info(f"🔍 Buscando en Google Places: '{place_info.query_busqueda}'")

            # Usar la búsqueda de texto de Google Places (importar directamente googlemaps)
            import googlemaps
            gmaps = googlemaps.Client(key=settings.GOOGLE_PLACES_API_KEY)

            # Búsqueda textual
            places_result = gmaps.places(
                query=place_info.query_busqueda,
                language='es'
            )

            if not places_result.get('results'):
                logger.warning("⚠️ No se encontraron resultados en Google Places")
                return None

            # Tomar el primer resultado (más relevante)
            place = places_result['results'][0]
            place_id = place['place_id']

            logger.info(f"📍 Lugar encontrado: {place.get('name')} (ID: {place_id})")

            # Obtener detalles completos
            place_details = gmaps.place(
                place_id=place_id,
                fields=[
                    'name', 'formatted_address', 'rating', 'user_ratings_total',
                    'reviews', 'photo', 'price_level', 'type', 'geometry',
                    'opening_hours', 'website', 'formatted_phone_number'
                ],
                language='es'
            )

            result = place_details['result']

            # Formatear datos
            formatted_data = {
                'place_id': place_id,
                'name': result.get('name'),
                'formatted_address': result.get('formatted_address'),
                'rating': result.get('rating'),
                'user_ratings_total': result.get('user_ratings_total', 0),
                'price_level': result.get('price_level'),
                'types': result.get('type', []),  # 'type' en la API, pero lo guardamos como 'types'
                'reviews': result.get('reviews', [])[:20],  # Últimas 20
                'geometry': result.get('geometry'),
                'website': result.get('website'),
                'phone': result.get('formatted_phone_number')
            }

            logger.info(f"✅ Datos de Google obtenidos: rating={formatted_data['rating']}, reviews={len(formatted_data['reviews'])}")

            return formatted_data

        except Exception as e:
            logger.error(f"❌ Error buscando en Google Places: {str(e)}")
            return None

    async def search_place_in_tripadvisor(
        self,
        place_name: str,
        lat: float,
        lng: float
    ) -> Optional[dict]:
        """
        Busca el lugar en TripAdvisor (opcional, puede fallar sin afectar el flujo)
        """
        try:
            logger.info(f"🔍 Buscando en TripAdvisor: '{place_name}'")

            # Usar timeout de 10 segundos
            locations = await asyncio.wait_for(
                asyncio.to_thread(
                    self.tripadvisor.search_location,
                    place_name,
                    lat,
                    lng
                ),
                timeout=10.0
            )

            if not locations:
                logger.info("ℹ️ No se encontró en TripAdvisor (continuando sin estos datos)")
                return None

            # Tomar el primer resultado
            location_id = locations[0].get('location_id')

            # Obtener detalles y reviews en paralelo
            details_task = asyncio.to_thread(
                self.tripadvisor.get_location_details,
                location_id
            )
            reviews_task = asyncio.to_thread(
                self.tripadvisor.get_reviews,
                location_id,
                15
            )

            details, reviews = await asyncio.gather(
                details_task,
                reviews_task,
                return_exceptions=True
            )

            if isinstance(details, Exception) or isinstance(reviews, Exception):
                logger.warning("⚠️ Error obteniendo datos de TripAdvisor")
                return None

            result = {
                'location_id': location_id,
                'name': details.get('name') if details else place_name,
                'rating': details.get('rating') if details else None,
                'num_reviews': details.get('num_reviews') if details else 0,
                'reviews': reviews if reviews else []
            }

            logger.info(f"✅ Datos de TripAdvisor obtenidos: rating={result['rating']}, reviews={len(result['reviews'])}")

            return result

        except asyncio.TimeoutError:
            logger.warning("⏱️ Timeout en TripAdvisor (continuando sin estos datos)")
            return None
        except Exception as e:
            logger.warning(f"⚠️ Error en TripAdvisor (no crítico): {str(e)}")
            return None

    async def analyze_experience(
        self,
        place_info: PlaceIdentification,
        google_data: dict,
        tripadvisor_data: Optional[dict]
    ) -> dict:
        """
        Analiza la experiencia usando Gemini con datos de Google Places y TripAdvisor
        """
        try:
            logger.info("🧠 Analizando experiencia con Gemini...")

            # Formatear reviews de Google
            google_reviews_text = self._format_reviews(google_data.get('reviews', []), 'google')

            # Construir sección de TripAdvisor
            has_tripadvisor = tripadvisor_data is not None
            if has_tripadvisor:
                tripadvisor_section = f"""
--- DATOS DE TRIPADVISOR ---
Rating: {tripadvisor_data.get('rating', 'N/A')}/5 ({tripadvisor_data.get('num_reviews', 0)} reseñas)

RESEÑAS DE TRIPADVISOR:
{self._format_reviews(tripadvisor_data.get('reviews', []), 'tripadvisor')}
"""
                data_source_note = "IMPORTANTE: Tienes datos de ambas plataformas. Prioriza patrones que se repiten en AMBAS fuentes."
            else:
                tripadvisor_section = "--- TRIPADVISOR: No disponible para este lugar ---"
                data_source_note = "IMPORTANTE: Solo tienes datos de Google Places. Basa tu análisis únicamente en esta fuente."

            # Construir prompt
            prompt_text = EXPERIENCE_ANALYSIS_PROMPT.format(
                nombre_lugar=google_data['name'],
                direccion=google_data['formatted_address'],
                tipo=place_info.tipo,
                elementos_visuales=json.dumps(place_info.ubicacion, indent=2, ensure_ascii=False),
                rating_google=google_data.get('rating', 'N/A'),
                total_reviews_google=google_data.get('user_ratings_total', 0),
                price_level=google_data.get('price_level', 'No especificado'),
                reviews_google=google_reviews_text,
                tripadvisor_section=tripadvisor_section,
                data_source_note=data_source_note
            )

            # Invocar Gemini
            response = await self.llm.ainvoke(prompt_text)

            # Parsear respuesta
            response_text = self._extract_text_content(response.content)
            analysis_json = self._extract_json(response_text)

            logger.info(f"✅ Análisis completado: score={analysis_json.get('score_realidad')}, recomendación={analysis_json.get('recomendacion')}")

            return analysis_json

        except Exception as e:
            logger.error(f"❌ Error analizando experiencia: {str(e)}")
            raise

    async def find_alternatives(
        self,
        google_data: dict,
        place_type: str,
        score_original: int
    ) -> list:
        """
        Busca lugares alternativos cercanos (solo si score < 85)
        """
        try:
            # Solo buscar alternativas si el score es bajo
            if score_original >= 85:
                logger.info("✅ Score alto, no se necesitan alternativas")
                return []

            logger.info(f"🔍 Buscando alternativas (score original: {score_original})...")

            import googlemaps
            gmaps = googlemaps.Client(key=settings.GOOGLE_PLACES_API_KEY)

            lat = google_data['geometry']['location']['lat']
            lng = google_data['geometry']['location']['lng']

            # Mapear tipo a Google Places type
            type_mapping = {
                'hotel': 'lodging',
                'restaurant': 'restaurant',
                'bar': 'bar',
                'cafe': 'cafe',
                'tourist_attraction': 'tourist_attraction',
                'museum': 'museum',
                'spa': 'spa'
            }
            google_type = type_mapping.get(place_type, 'point_of_interest')

            # Buscar lugares cercanos
            nearby_search = gmaps.places_nearby(
                location=(lat, lng),
                radius=2000,  # 2km
                type=google_type,
                rank_by='prominence'
            )

            alternatives = []

            for place in nearby_search.get('results', [])[:5]:
                # Saltar el lugar original
                if place['place_id'] == google_data['place_id']:
                    continue

                # Filtrar por rating mínimo
                if place.get('rating', 0) < 4.0:
                    continue

                # Obtener detalles básicos
                try:
                    details = gmaps.place(
                        place_id=place['place_id'],
                        fields=['name', 'rating', 'user_ratings_total', 'price_level', 'formatted_address', 'geometry']
                    )['result']

                    # Calcular distancia
                    alt_lat = place['geometry']['location']['lat']
                    alt_lng = place['geometry']['location']['lng']
                    distance_km = self._calculate_distance(lat, lng, alt_lat, alt_lng)

                    alternatives.append({
                        'place_id': place['place_id'],
                        'nombre': details['name'],
                        'porque_es_mejor': f"Rating más alto ({details.get('rating', 0)}/5) y mejor valorado en la zona",
                        'rating_google': details.get('rating', 0),
                        'total_reviews': details.get('user_ratings_total', 0),
                        'direccion': details.get('formatted_address', ''),
                        'precio_nivel': details.get('price_level'),
                        'distancia_km': round(distance_km, 2)
                    })

                except Exception as e:
                    logger.warning(f"⚠️ Error obteniendo detalles de alternativa: {str(e)}")
                    continue

            logger.info(f"✅ {len(alternatives)} alternativas encontradas")

            return alternatives[:3]  # Top 3

        except Exception as e:
            logger.error(f"❌ Error buscando alternativas: {str(e)}")
            return []

    async def validate_experience(
        self,
        image_bytes: bytes,
        user_id: str,
        skip_cache: bool = False
    ) -> ExperienceValidationResponse:
        """
        Flujo completo de validación de experiencia con caché integrado

        Args:
            image_bytes: Bytes de la imagen del screenshot
            user_id: ID del usuario
            skip_cache: Si es True, fuerza re-validación sin usar caché
        """
        start_time = time.time()

        try:
            logger.info(f"🚀 Iniciando validación de experiencia para user {user_id}")

            # Obtener info de la imagen
            image_info = get_image_info(image_bytes)
            image_hash = generate_image_hash(image_bytes)

            logger.info(
                f"📸 Imagen: {image_info['file_size_kb']}KB, "
                f"{image_info['width']}x{image_info['height']}, "
                f"hash: {image_hash[:8]}..."
            )

            # PASO 0: Buscar en caché (si no está deshabilitado)
            if not skip_cache:
                logger.info("🔍 Buscando en caché...")
                cached_result = validation_cache.get_validation(image_bytes)

                if cached_result:
                    logger.info("⚡ CACHE HIT - Retornando resultado cacheado")

                    # Convertir dict a ExperienceValidationResponse
                    cached_response = ExperienceValidationResponse(**cached_result)

                    # Actualizar tiempo de procesamiento (casi instantáneo desde caché)
                    cached_response.tiempo_procesamiento_segundos = round(time.time() - start_time, 2)

                    return cached_response

                logger.info("❌ CACHE MISS - Procediendo con validación completa")

            # 1. Pre-validación de calidad (opcional, pero recomendado)
            quality_check = await self.validate_screenshot_quality(image_bytes)

            if not quality_check.es_valido:
                logger.warning(f"⚠️ Screenshot no válido: {quality_check.problemas}")
                # Podríamos lanzar una excepción aquí, pero mejor continuar con advertencia

            # 2. Identificar lugar
            place_info = await self.identify_place_from_screenshot(image_bytes)

            if place_info.confianza_identificacion < 60:
                raise ValueError(f"Confianza de identificación muy baja ({place_info.confianza_identificacion}%). {place_info.razon_confianza}")

            # 3. Buscar en Google Places (obligatorio)
            google_data = await self.search_place_in_google(place_info)

            if not google_data or not google_data.get('place_id'):
                raise ValueError("No se encontró el lugar en Google Places")

            # 4. Buscar en TripAdvisor (opcional, en paralelo si queremos optimizar)
            lat = google_data['geometry']['location']['lat']
            lng = google_data['geometry']['location']['lng']

            tripadvisor_data = await self.search_place_in_tripadvisor(
                place_info.nombre,
                lat,
                lng
            )

            # 5. Analizar experiencia con Gemini
            analysis = await self.analyze_experience(
                place_info,
                google_data,
                tripadvisor_data
            )

            # 6. Buscar alternativas si es necesario
            alternatives = await self.find_alternatives(
                google_data,
                place_info.tipo,
                analysis['score_realidad']
            )

            # 7. Construir respuesta
            elapsed_time = time.time() - start_time

            response = ExperienceValidationResponse(
                lugar_identificado=place_info,
                score_realidad=analysis['score_realidad'],
                recomendacion=analysis['recomendacion'],
                razon_recomendacion=analysis['razon_recomendacion'],
                analisis=Analisis(**{
                    'red_flags': analysis['red_flags'],
                    'aspectos_positivos': analysis['aspectos_positivos'],
                    'aspectos_negativos': analysis['aspectos_negativos'],
                    'discrepancia_imagen_realidad': analysis['discrepancia_imagen_realidad'],
                    'tendencia_temporal': analysis['tendencia_temporal']
                }),
                alternativas=[Alternativa(**alt) for alt in alternatives],
                fuentes_consultadas=FuentesConsultadas(
                    google_places=True,
                    tripadvisor=tripadvisor_data is not None
                ),
                tiempo_procesamiento_segundos=round(elapsed_time, 2)
            )

            logger.info(f"✅ Validación completada en {elapsed_time:.2f}s")

            # PASO 7: Guardar en caché (async, no bloqueante)
            if not skip_cache:
                try:
                    logger.info("💾 Guardando resultado en caché...")
                    # Convertir response a dict para guardar
                    result_dict = response.model_dump()
                    validation_cache.save_validation(
                        image_bytes,
                        result_dict,
                        user_id
                    )
                except Exception as cache_error:
                    # No fallar si el caché falla
                    logger.warning(f"⚠️ Error guardando en caché (no crítico): {str(cache_error)}")

            return response

        except Exception as e:
            logger.error(f"❌ Error en validación de experiencia: {str(e)}")
            raise

    # ==================== Helper Methods ====================

    def _extract_text_content(self, content) -> str:
        """Extrae texto de contenido que puede ser string, lista de objetos, o bytes"""
        if isinstance(content, bytes):
            return content.decode('utf-8')

        if isinstance(content, list):
            text_parts = []
            for part in content:
                if isinstance(part, dict):
                    if part.get('type') == 'text' and 'text' in part:
                        text_parts.append(part['text'])
                    elif 'text' in part:
                        text_parts.append(part['text'])
                elif isinstance(part, str):
                    text_parts.append(part)
            return '\n'.join(text_parts) if text_parts else str(content)

        if isinstance(content, str):
            return content

        return str(content)

    def _extract_json(self, text: str) -> dict:
        """Extrae JSON de una respuesta de texto"""
        import re

        # Buscar bloques de código JSON
        code_block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
        if code_block_match:
            json_str = code_block_match.group(1)
        else:
            # Buscar JSON directo
            start_idx = text.find('{')
            end_idx = text.rfind('}')

            if start_idx == -1 or end_idx == -1 or end_idx <= start_idx:
                raise ValueError("No se encontró JSON en la respuesta de Gemini")

            json_str = text[start_idx:end_idx + 1]

        # Parsear
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Error parseando JSON: {str(e)}")
            logger.error(f"JSON problemático: {json_str[:500]}")
            raise

    def _format_reviews(self, reviews: list, source: str) -> str:
        """Formatea reviews para el prompt"""
        formatted = []

        for r in reviews[:20]:  # Max 20
            if source == 'google':
                text = r.get('text', '')
                rating = r.get('rating', 'N/A')
            else:  # tripadvisor
                text = r.get('text', '')
                rating = r.get('rating', 'N/A')

            if text:
                formatted.append(f"- Rating: {rating}/5 | {text[:200]}")

        return '\n'.join(formatted) if formatted else "No hay reviews disponibles"

    def _calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calcula distancia entre dos coordenadas en km usando fórmula de Haversine"""
        from math import radians, sin, cos, sqrt, atan2

        R = 6371  # Radio de la Tierra en km

        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lng = radians(lng2 - lng1)

        a = sin(delta_lat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lng / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c


# Instancia global
experience_validation_service = ExperienceValidationService()
