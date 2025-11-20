from typing import Optional
from datetime import datetime, timedelta
import uuid
import logging
from math import radians, sin, cos, sqrt, atan2

from app.models.exploration_session import (
    ExplorationSession,
    ExplorationSessionStatus,
    LocationUpdate,
    SessionSummary
)
from app.repositories.session_repository import session_repository

logger = logging.getLogger(__name__)


class SessionService:
    """Servicio para gestionar sesiones de exploración"""

    # Configuración de costos
    COST_PER_ALERT = 0.002  # $0.002 por alerta (estimado)

    def create_session(
        self,
        user_id: str,
        duration_minutes: int,
        max_alerts: int
    ) -> ExplorationSession:
        """Crea nueva sesión de exploración"""

        now = datetime.now()

        session = ExplorationSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            status=ExplorationSessionStatus.ACTIVE,
            duration_minutes=duration_minutes,
            max_alerts=max_alerts,
            started_at=now,
            expires_at=now + timedelta(minutes=duration_minutes),
            alerts_generated=0,
            alerts_interacted=0,
            places_discovered=0,
            distance_walked_meters=0.0,
            estimated_cost_usd=0.0,
            is_paused=False
        )

        # Guardar en Firebase
        success = session_repository.save_session(session)

        if success:
            logger.info(f"✅ Sesión {session.id} creada para usuario {user_id}")
            logger.info(f"   Duración: {duration_minutes} min | Max alertas: {max_alerts}")
        else:
            logger.error(f"❌ Error creando sesión para usuario {user_id}")

        return session

    def get_active_session(self, user_id: str) -> Optional[ExplorationSession]:
        """Obtiene sesión activa del usuario (si existe)"""
        session = session_repository.get_active_session(user_id)

        if not session:
            return None

        # Auto-expirar si pasó el tiempo
        if datetime.now() > session.expires_at:
            logger.info(f"⏰ Sesión {session.id} expiró automáticamente")
            self.expire_session(session.id)
            return None

        return session

    def update_metrics(
        self,
        session_id: str,
        alerts_count: int,
        location: LocationUpdate,
        interacted: bool = False
    ) -> bool:
        """
        Actualiza métricas de la sesión

        Args:
            session_id: ID de la sesión
            alerts_count: Número de alertas generadas en este update
            location: Ubicación actual del usuario
            interacted: Si el usuario interactuó con la alerta
        """
        try:
            session = session_repository.get_session(session_id)

            if not session:
                logger.warning(f"⚠️ Sesión {session_id} no encontrada para actualizar métricas")
                return False

            # Actualizar contadores
            session.alerts_generated += alerts_count
            session.places_discovered += alerts_count  # Cada alerta = 1 lugar nuevo

            if interacted:
                session.alerts_interacted += 1

            # Calcular distancia recorrida (si hay ubicación anterior)
            prev_location = session_repository.get_last_location(session_id)
            if prev_location:
                distance = self._calculate_distance(
                    prev_location.latitude,
                    prev_location.longitude,
                    location.latitude,
                    location.longitude
                )
                session.distance_walked_meters += distance
                logger.debug(f"📏 Distancia recorrida: +{distance:.2f}m (total: {session.distance_walked_meters:.2f}m)")

            # Estimar costo (transparencia para el usuario)
            session.estimated_cost_usd += alerts_count * self.COST_PER_ALERT

            logger.info(f"📊 Métricas actualizadas para sesión {session_id}")
            logger.info(f"   Alertas: {session.alerts_generated}/{session.max_alerts}")
            logger.info(f"   Lugares: {session.places_discovered}")
            logger.info(f"   Distancia: {session.distance_walked_meters:.2f}m")
            logger.info(f"   Costo estimado: ${session.estimated_cost_usd:.4f}")

            # Guardar cambios
            session_repository.update_session(session)

            # Guardar ubicación actual
            session_repository.save_location(session_id, location)

            return True

        except Exception as e:
            logger.error(f"❌ Error actualizando métricas de sesión {session_id}: {str(e)}")
            return False

    def pause_session(self, session_id: str) -> bool:
        """Pausa una sesión activa"""
        try:
            session = session_repository.get_session(session_id)

            if not session:
                return False

            if session.status != ExplorationSessionStatus.ACTIVE:
                logger.warning(f"⚠️ Sesión {session_id} no está activa, no se puede pausar")
                return False

            session.status = ExplorationSessionStatus.PAUSED
            session.is_paused = True
            session.paused_at = datetime.now()

            session_repository.update_session(session)
            logger.info(f"⏸️ Sesión {session_id} pausada")

            return True

        except Exception as e:
            logger.error(f"❌ Error pausando sesión {session_id}: {str(e)}")
            return False

    def resume_session(self, session_id: str) -> bool:
        """Reactiva una sesión pausada"""
        try:
            session = session_repository.get_session(session_id)

            if not session:
                return False

            if session.status != ExplorationSessionStatus.PAUSED:
                logger.warning(f"⚠️ Sesión {session_id} no está pausada")
                return False

            # Verificar que no haya expirado mientras estaba pausada
            if datetime.now() > session.expires_at:
                logger.warning(f"⏰ Sesión {session_id} expiró mientras estaba pausada")
                self.expire_session(session_id)
                return False

            session.status = ExplorationSessionStatus.ACTIVE
            session.is_paused = False
            # Mantener paused_at para registro histórico

            session_repository.update_session(session)
            logger.info(f"▶️ Sesión {session_id} reactivada")

            return True

        except Exception as e:
            logger.error(f"❌ Error reactivando sesión {session_id}: {str(e)}")
            return False

    def end_session(self, session_id: str) -> SessionSummary:
        """Finaliza sesión manualmente y retorna resumen"""
        try:
            session = session_repository.get_session(session_id)

            if not session:
                raise ValueError(f"Sesión {session_id} no encontrada")

            session.status = ExplorationSessionStatus.ENDED
            session.ended_at = datetime.now()

            # Calcular duración real
            duration = (session.ended_at - session.started_at).total_seconds() / 60

            session_repository.update_session(session)

            # Generar mensaje personalizado
            message = self._generate_summary_message(session, duration)

            logger.info(f"🏁 Sesión {session_id} finalizada")
            logger.info(f"   Duración: {duration:.1f} min")
            logger.info(f"   Lugares: {session.places_discovered}")
            logger.info(f"   Distancia: {session.distance_walked_meters:.2f}m")

            return SessionSummary(
                duration_minutes=int(duration),
                places_discovered=session.places_discovered,
                alerts_generated=session.alerts_generated,
                alerts_interacted=session.alerts_interacted,
                distance_walked_km=round(session.distance_walked_meters / 1000, 2),
                estimated_cost=f"${session.estimated_cost_usd:.4f}",
                message=message
            )

        except Exception as e:
            logger.error(f"❌ Error finalizando sesión {session_id}: {str(e)}")
            raise

    def expire_session(self, session_id: str) -> bool:
        """Auto-expira una sesión"""
        try:
            session = session_repository.get_session(session_id)

            if not session:
                return False

            session.status = ExplorationSessionStatus.EXPIRED
            session.ended_at = datetime.now()

            session_repository.update_session(session)
            logger.info(f"⏰ Sesión {session_id} expirada automáticamente")

            return True

        except Exception as e:
            logger.error(f"❌ Error expirando sesión {session_id}: {str(e)}")
            return False

    def get_session_summary(self, session_id: str) -> dict:
        """Obtiene resumen de una sesión (para sesiones expiradas)"""
        try:
            session = session_repository.get_session(session_id)

            if not session:
                return {}

            duration = 0
            if session.ended_at:
                duration = (session.ended_at - session.started_at).total_seconds() / 60

            return {
                "duration_minutes": int(duration),
                "places_discovered": session.places_discovered,
                "alerts_generated": session.alerts_generated,
                "alerts_interacted": session.alerts_interacted,
                "distance_walked_meters": session.distance_walked_meters,
                "estimated_cost_usd": session.estimated_cost_usd,
                "message": self._generate_summary_message(session, duration)
            }

        except Exception as e:
            logger.error(f"❌ Error obteniendo resumen de sesión {session_id}: {str(e)}")
            return {}

    def _generate_summary_message(
        self,
        session: ExplorationSession,
        duration: float
    ) -> str:
        """Genera mensaje de resumen amigable"""

        discoveries = session.places_discovered
        distance_km = session.distance_walked_meters / 1000

        if discoveries == 0:
            return "No descubriste nuevos lugares en esta sesión. ¡Intenta caminar más la próxima vez!"

        if discoveries < 5:
            return f"Descubriste {discoveries} lugares en {int(duration)} minutos. ¡Buen comienzo!"

        if discoveries < 15:
            return f"¡Excelente exploración! Descubriste {discoveries} lugares caminando {distance_km:.1f}km."

        return f"🎉 ¡Increíble! {discoveries} lugares descubiertos en {int(duration)} minutos. Recorriste {distance_km:.1f}km."

    def _calculate_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calcula distancia entre dos coordenadas usando fórmula de Haversine

        Returns:
            Distancia en metros
        """
        # Radio de la Tierra en metros
        R = 6371000

        # Convertir a radianes
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)

        # Fórmula de Haversine
        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        distance = R * c

        return distance


# Instancia global
session_service = SessionService()
