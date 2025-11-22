from typing import List, Optional, Set
from datetime import datetime
import uuid
import logging
from math import radians, sin, cos, sqrt, atan2

from app.models.route_alert import (
    RouteAlert,
    AlertPriority,
    AlertReason,
    AlertGenerationConfig,
    AlertInteraction
)
from app.models.place import Place, PlaceSearchParams, GeoPoint
from app.models.exploration_session import ExplorationSession, LocationUpdate
from app.services.place_service import place_service
from app.services.preference_learning_service import preference_learning_service
from app.core.firebase import firebase_service

logger = logging.getLogger(__name__)


class RouteAlertService:
    """Servicio para generar alertas inteligentes de lugares en la ruta"""

    def __init__(self):
        self.alerts_ref = "route_alerts"
        self.interactions_ref = "alert_interactions"
        self.shown_places_ref = "shown_places"  # Para deduplicación
        self.use_ai_agent = True  # Flag para habilitar/deshabilitar AI Agent
        self._ai_agent = None  # Lazy loading del agent

    @property
    def ai_agent(self):
        """Lazy loading del AI Agent"""
        if self._ai_agent is None and self.use_ai_agent:
            try:
                from app.services.llm.alert_agent import alert_generator_agent
                self._ai_agent = alert_generator_agent
                logger.info("🤖 AI Agent cargado exitosamente")
            except Exception as e:
                logger.error(f"❌ Error cargando AI Agent: {str(e)}")
                self.use_ai_agent = False  # Desactivar si falla
        return self._ai_agent

    async def get_instant_alerts_with_ai(
        self,
        user_id: str,
        location: LocationUpdate,
        session: ExplorationSession,
        user_profile: Optional[dict] = None
    ) -> List[RouteAlert]:
        """
        Genera alertas usando AI Agent (Gemini como orquestador)

        Gemini coordina:
        1. Búsqueda en Google Places
        2. Verificación en TripAdvisor
        3. Análisis de reviews recientes
        4. Personalización según perfil
        5. Generación de mensajes contextualizados

        Falls back to lógica programada si falla.
        """
        try:
            logger.info("🤖 Generando alertas con AI Agent (Gemini orquestador)")

            # Verificar si AI Agent está disponible
            if not self.use_ai_agent or self.ai_agent is None:
                logger.warning("⚠️ AI Agent no disponible, usando lógica programada")
                return self.get_instant_alerts(user_id, location, session, user_profile)

            # Obtener lugares ya mostrados para no repetir
            shown_places = self._get_shown_places(session.id)

            # Generar alertas con AI Agent
            ai_result = await self.ai_agent.generate_alerts(
                latitude=location.latitude,
                longitude=location.longitude,
                user_id=user_id,
                user_profile=user_profile or {},
                max_alerts=3
            )

            alerts_data = ai_result.get('alerts', [])
            reasoning = ai_result.get('reasoning', '')

            logger.info(f"🧠 AI Reasoning: {reasoning}")
            logger.info(f"✅ AI generó {len(alerts_data)} alertas")

            if not alerts_data:
                logger.info("ℹ️ AI no generó alertas, no hay lugares relevantes")
                return []

            # Convertir alertas del AI a objetos RouteAlert
            alerts = []
            for alert_data in alerts_data:
                place_id = alert_data.get('place_id')

                # Filtrar si ya fue mostrado
                if place_id in shown_places:
                    logger.info(f"⏭️ Skipping {alert_data.get('place_name')} - ya mostrado")
                    continue

                # Obtener datos completos del lugar
                place_details = place_service.get_place_details(place_id)
                if not place_details:
                    logger.warning(f"⚠️ No se encontraron detalles para {place_id}")
                    continue

                # Convertir Place Details a Place
                place = Place(
                    id=place_details.id,
                    name=place_details.name,
                    coords=place_details.coords,
                    rating=place_details.rating,
                    address=place_details.address,
                    price_level=place_details.price_level,
                    photos=place_details.photos,
                    sources=place_details.sources,
                    tripadvisor=place_details.tripadvisor,
                    categories=place_details.categories
                )

                # Mapear prioridad del AI
                priority_str = alert_data.get('priority', 'medium').lower()
                priority = AlertPriority.HIGH if priority_str == 'high' else \
                          AlertPriority.MEDIUM if priority_str == 'medium' else \
                          AlertPriority.LOW

                # Mapear razones
                reasons_str = alert_data.get('reasons', [])
                reasons = []
                for reason in reasons_str:
                    try:
                        reasons.append(AlertReason(reason))
                    except ValueError:
                        logger.warning(f"⚠️ Razón desconocida: {reason}")

                # Crear RouteAlert
                alert = RouteAlert(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    user_id=user_id,
                    place=place,
                    distance_meters=alert_data.get('distance_meters', 0),
                    priority=priority,
                    reasons=reasons,
                    match_score=alert_data.get('match_score', 0.5),
                    personalized_message=alert_data.get('personalized_message', ''),
                    estimated_time_minutes=int(alert_data.get('distance_meters', 0) / 80),
                    is_open_now=None,
                    created_at=datetime.now()
                )

                alerts.append(alert)

                # Marcar como mostrado
                self._mark_place_as_shown(session.id, place_id)

                # Guardar alerta
                self._save_alert(alert)

            logger.info(f"✅ Procesadas {len(alerts)} alertas del AI")
            return alerts

        except Exception as e:
            logger.error(f"❌ Error en AI Agent: {str(e)}")
            logger.exception(e)
            logger.warning("⚠️ Fallback a lógica programada")
            # Fallback a lógica programada
            return self.get_instant_alerts(user_id, location, session, user_profile)

    def get_instant_alerts(
        self,
        user_id: str,
        location: LocationUpdate,
        session: ExplorationSession,
        user_profile: Optional[dict] = None
    ) -> List[RouteAlert]:
        """
        Genera alertas instantáneas basadas en la ubicación actual

        Args:
            user_id: ID del usuario
            location: Ubicación actual
            session: Sesión activa de exploración
            user_profile: Perfil del usuario con intereses y preferencias
        """
        try:
            # Configuración de generación de alertas
            config = self._build_config_from_profile(user_profile)

            logger.info(f"🔍 Buscando lugares cerca de ({location.latitude}, {location.longitude})")
            logger.info(f"   Radio: {config.max_distance_meters}m | Intereses: {config.user_interests}")

            # Buscar lugares cercanos
            search_params = PlaceSearchParams(
                location=GeoPoint(
                    latitude=location.latitude,
                    longitude=location.longitude
                ),
                radius=config.max_distance_meters,
                place_type=None  # Buscar todos los tipos
            )

            places = place_service.search_places(search_params)
            logger.info(f"   Encontrados {len(places)} lugares")

            if not places:
                logger.info("   No hay lugares cercanos")
                return []

            # Filtrar lugares ya mostrados en esta sesión
            shown_places = self._get_shown_places(session.id)
            new_places = [p for p in places if p.id not in shown_places]

            logger.info(f"   {len(new_places)} lugares nuevos (no mostrados antes)")

            if not new_places:
                return []

            # Generar y puntuar alertas
            alerts = self._generate_alerts(
                user_id=user_id,
                session=session,
                places=new_places,
                current_location=location,
                config=config
            )

            # Ordenar por prioridad y score
            alerts.sort(key=lambda a: (
                0 if a.priority == AlertPriority.HIGH else 1 if a.priority == AlertPriority.MEDIUM else 2,
                -a.match_score
            ))

            # Limitar cantidad
            alerts = alerts[:config.max_alerts_per_update]

            logger.info(f"✅ Generadas {len(alerts)} alertas")
            for alert in alerts:
                logger.info(f"   - {alert.place.name} ({alert.priority}) | Score: {alert.match_score:.2f} | {alert.distance_meters:.0f}m")

            # Marcar lugares como mostrados
            for alert in alerts:
                self._mark_place_as_shown(session.id, alert.place.id)

            # Guardar alertas en Firebase
            for alert in alerts:
                self._save_alert(alert)

            return alerts

        except Exception as e:
            logger.error(f"❌ Error generando alertas: {str(e)}")
            logger.exception(e)
            return []

    def _generate_alerts(
        self,
        user_id: str,
        session: ExplorationSession,
        places: List[Place],
        current_location: LocationUpdate,
        config: AlertGenerationConfig
    ) -> List[RouteAlert]:
        """Genera alertas con puntuación y personalización"""
        alerts = []

        for place in places:
            # Calcular distancia
            distance = self._calculate_distance(
                current_location.latitude,
                current_location.longitude,
                place.coords.latitude,
                place.coords.longitude
            )

            # Filtrar por distancia máxima
            if distance > config.max_distance_meters:
                continue

            # Filtrar por rating mínimo
            if place.rating and place.rating < config.min_rating:
                continue

            # Analizar y puntuar (ahora con ML)
            analysis = self._analyze_place(place, config, user_id=user_id)

            if not analysis['reasons']:
                continue  # No hay razones para alertar

            # Generar mensaje personalizado
            message = self._generate_personalized_message(
                place=place,
                reasons=analysis['reasons'],
                distance=distance,
                user_interests=config.user_interests
            )

            # Crear alerta
            alert = RouteAlert(
                id=str(uuid.uuid4()),
                session_id=session.id,
                user_id=user_id,
                place=place,
                distance_meters=distance,
                priority=analysis['priority'],
                reasons=analysis['reasons'],
                match_score=analysis['score'],
                personalized_message=message,
                estimated_time_minutes=int(distance / 80),  # Asumiendo 80m/min caminando
                is_open_now=None,  # TODO: Implementar verificación de horarios
                created_at=datetime.now()
            )

            alerts.append(alert)

        return alerts

    def _analyze_place(
        self,
        place: Place,
        config: AlertGenerationConfig,
        user_id: Optional[str] = None
    ) -> dict:
        """
        Analiza un lugar y determina si es relevante

        NUEVO: Aplica aprendizaje automático basado en comportamiento del usuario

        Returns:
            dict con 'priority', 'reasons', 'score'
        """
        reasons = []
        score = 0.0
        weights = {
            'interest_match': 0.4,
            'rating': 0.3,
            'reviews': 0.2,
            'budget': 0.1
        }

        # 1. Verificar coincidencia con intereses
        interest_match = self._check_interest_match(place.categories, config.user_interests)
        if interest_match > 0:
            reasons.append(AlertReason.INTEREST_MATCH)
            score += interest_match * weights['interest_match']

        # 2. Rating alto
        if place.rating:
            if place.rating >= 4.5:
                reasons.append(AlertReason.HIGH_RATING)
                score += (place.rating / 5.0) * weights['rating']
            elif place.rating >= config.min_rating:
                score += (place.rating / 5.0) * weights['rating'] * 0.5

        # 3. Hidden gem (alto rating pero pocas reviews)
        if config.include_hidden_gems:
            # Asumimos que reviews_count podría no estar en Place base
            # reviews_count = getattr(place, 'reviews_count', 0)
            # if place.rating and place.rating >= 4.5 and reviews_count < 50:
            #     reasons.append(AlertReason.HIDDEN_GEM)
            #     score += 0.15
            pass  # Comentado por ahora

        # 4. Presupuesto
        if config.budget_max and place.price_level:
            if place.price_level <= 2:  # 0, 1, 2 = económico/moderado
                reasons.append(AlertReason.BUDGET_FRIENDLY)
                score += weights['budget']

        # 5. Si no hay razones específicas pero está cerca
        if not reasons and place.rating and place.rating >= config.min_rating:
            reasons.append(AlertReason.NEARBY)
            score = 0.3  # Score bajo para lugares genéricos

        # 🧠 NUEVO: Aplicar aprendizaje automático para ajustar score
        if user_id:
            score = self._apply_learned_preferences(user_id, place, score)
            logger.debug(f"   🧠 Score ajustado con ML para {place.name}: {score:.2f}")

        # Determinar prioridad
        if score >= 0.7:
            priority = AlertPriority.HIGH
        elif score >= 0.4:
            priority = AlertPriority.MEDIUM
        else:
            priority = AlertPriority.LOW

        return {
            'priority': priority,
            'reasons': reasons,
            'score': min(score, 1.0)  # Normalizar a 0-1
        }

    def _check_interest_match(
        self,
        place_categories: List[str],
        user_interests: List[str]
    ) -> float:
        """
        Verifica coincidencia entre categorías del lugar e intereses del usuario

        Returns:
            Score de 0.0 a 1.0
        """
        if not user_interests or not place_categories:
            return 0.0

        # Normalizar para comparación
        place_cats_lower = [cat.lower() for cat in place_categories]
        interests_lower = [interest.lower() for interest in user_interests]

        # Mapeo de intereses a categorías de Google Places
        interest_mapping = {
            'gastronomia': ['restaurant', 'cafe', 'food', 'bar', 'bakery'],
            'gastronomía': ['restaurant', 'cafe', 'food', 'bar', 'bakery'],
            'cultura': ['museum', 'art_gallery', 'library', 'cultural_center'],
            'historia': ['museum', 'historical', 'monument', 'landmark'],
            'naturaleza': ['park', 'natural_feature', 'hiking', 'garden'],
            'aventura': ['adventure', 'outdoor', 'sports', 'amusement_park'],
            'compras': ['shopping_mall', 'store', 'market'],
            'vida nocturna': ['night_club', 'bar', 'casino'],
            'arte': ['art_gallery', 'museum', 'theater'],
            'deportes': ['stadium', 'gym', 'sports_complex']
        }

        matches = 0
        for interest in interests_lower:
            # Buscar mapeo
            mapped_categories = interest_mapping.get(interest, [interest])

            for mapped_cat in mapped_categories:
                if any(mapped_cat in place_cat for place_cat in place_cats_lower):
                    matches += 1
                    break

        if matches == 0:
            return 0.0

        # Score basado en proporción de intereses que coinciden
        return min(matches / len(interests_lower), 1.0)

    def _generate_personalized_message(
        self,
        place: Place,
        reasons: List[AlertReason],
        distance: float,
        user_interests: List[str]
    ) -> str:
        """Genera mensaje personalizado según las razones de la alerta"""

        distance_str = f"{int(distance)}m" if distance < 1000 else f"{distance/1000:.1f}km"

        # Priorizar razones
        if AlertReason.INTEREST_MATCH in reasons:
            interest_str = ", ".join(user_interests[:2])  # Primeros 2 intereses
            return f"¡{place.name} coincide con tus intereses en {interest_str}! A solo {distance_str}."

        if AlertReason.HIGH_RATING in reasons:
            rating_emoji = "⭐" * int(place.rating) if place.rating else ""
            return f"{rating_emoji} {place.name} tiene excelentes reseñas ({place.rating}/5). A {distance_str}."

        if AlertReason.HIDDEN_GEM in reasons:
            return f"💎 Joya oculta: {place.name}. Pocos lo conocen pero tiene alta puntuación. A {distance_str}."

        if AlertReason.BUDGET_FRIENDLY in reasons:
            return f"💰 {place.name} se ajusta a tu presupuesto. A {distance_str}."

        # Mensaje genérico
        return f"📍 {place.name} está cerca ({distance_str}). ¿Quieres explorar?"

    def _build_config_from_profile(
        self,
        user_profile: Optional[dict]
    ) -> AlertGenerationConfig:
        """Construye configuración desde el perfil del usuario"""

        if not user_profile:
            return AlertGenerationConfig()

        interests = user_profile.get('interests', [])
        preferences = user_profile.get('preferences', {})
        budget = preferences.get('budget', {})

        return AlertGenerationConfig(
            max_distance_meters=500,  # 500m por defecto
            min_rating=3.5,
            max_alerts_per_update=3,
            include_hidden_gems=True,
            user_interests=interests,
            budget_max=budget.get('max') if budget else None
        )

    def _calculate_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """Calcula distancia en metros entre dos coordenadas"""
        R = 6371000  # Radio de la Tierra en metros

        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)

        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c

    def _get_shown_places(self, session_id: str) -> Set[str]:
        """Obtiene IDs de lugares ya mostrados en esta sesión"""
        try:
            db = firebase_service.get_db()
            shown = db.child(self.shown_places_ref).child(session_id).get().val()

            if not shown:
                return set()

            return set(shown.keys())
        except Exception as e:
            logger.error(f"Error obteniendo lugares mostrados: {str(e)}")
            return set()

    def _mark_place_as_shown(self, session_id: str, place_id: str) -> bool:
        """Marca un lugar como ya mostrado en la sesión"""
        try:
            db = firebase_service.get_db()
            db.child(self.shown_places_ref).child(session_id).child(place_id).set({
                'shown_at': datetime.now().isoformat()
            })
            return True
        except Exception as e:
            logger.error(f"Error marcando lugar como mostrado: {str(e)}")
            return False

    def _save_alert(self, alert: RouteAlert) -> bool:
        """Guarda una alerta en Firebase"""
        try:
            db = firebase_service.get_db()
            alert_data = alert.model_dump()

            # Convertir datetime a ISO string
            alert_data['created_at'] = alert.created_at.isoformat()
            if alert.interaction_at:
                alert_data['interaction_at'] = alert.interaction_at.isoformat()

            db.child(self.alerts_ref).child(alert.id).set(alert_data)
            return True
        except Exception as e:
            logger.error(f"Error guardando alerta: {str(e)}")
            return False

    def record_interaction(
        self,
        alert_id: str,
        user_id: str,
        session_id: str,
        interaction_type: str
    ) -> bool:
        """
        Registra interacción del usuario con una alerta

        NUEVO: Dispara re-análisis de preferencias después de cada interacción
        """
        try:
            interaction = AlertInteraction(
                alert_id=alert_id,
                user_id=user_id,
                session_id=session_id,
                interaction_type=interaction_type,
                timestamp=datetime.now()
            )

            db = firebase_service.get_db()
            interaction_data = interaction.model_dump()
            interaction_data['timestamp'] = interaction.timestamp.isoformat()

            db.child(self.interactions_ref).push(interaction_data)

            # Actualizar alerta
            db.child(self.alerts_ref).child(alert_id).update({
                'user_interacted': True,
                'interaction_at': datetime.now().isoformat()
            })

            logger.info(f"📊 Interacción registrada: {interaction_type} en alerta {alert_id}")

            # 🧠 NUEVO: Re-analizar preferencias si es una interacción significativa
            # Se hace de forma asíncrona/lazy para no bloquear
            if interaction_type in ['tapped', 'saved', 'dismissed']:
                try:
                    # Re-analizar preferencias en segundo plano
                    preference_learning_service.analyze_user_interactions(user_id)
                    logger.info(f"🧠 Preferencias re-analizadas para {user_id}")
                except Exception as e:
                    logger.warning(f"⚠️ Error re-analizando preferencias: {str(e)}")
                    # No fallar la operación principal si falla el análisis

            return True

        except Exception as e:
            logger.error(f"Error registrando interacción: {str(e)}")
            return False

    def _apply_learned_preferences(
        self,
        user_id: str,
        place: Place,
        base_score: float
    ) -> float:
        """
        Aplica preferencias aprendidas para ajustar el score de un lugar

        Args:
            user_id: ID del usuario
            place: Lugar a evaluar
            base_score: Score base calculado

        Returns:
            Score ajustado basado en preferencias aprendidas
        """
        try:
            adjusted_score = base_score

            # Aplicar boost por categorías aprendidas
            category_boosts = []
            for category in place.categories:
                boost = preference_learning_service.get_category_boost(user_id, category)
                category_boosts.append(boost)

            if category_boosts:
                # Usar el boost promedio de las categorías
                avg_boost = sum(category_boosts) / len(category_boosts)
                adjusted_score *= avg_boost

                if avg_boost > 1.1:
                    logger.debug(f"      ⬆️ Boost positivo: {avg_boost:.2f}x para {place.categories}")
                elif avg_boost < 0.9:
                    logger.debug(f"      ⬇️ Boost negativo: {avg_boost:.2f}x para {place.categories}")

            # Aplicar boost por precio aprendido
            if place.price_level is not None:
                price_boost = preference_learning_service.get_price_boost(user_id, place.price_level)
                adjusted_score *= price_boost

                if price_boost < 0.9:
                    logger.debug(f"      💰 Penalización por precio nivel {place.price_level}: {price_boost:.2f}x")

            # Normalizar para mantener en rango 0-1
            adjusted_score = max(0.0, min(1.0, adjusted_score))

            return adjusted_score

        except Exception as e:
            logger.warning(f"Error aplicando preferencias aprendidas: {str(e)}")
            return base_score  # Fallback al score base si hay error


# Instancia global
route_alert_service = RouteAlertService()
