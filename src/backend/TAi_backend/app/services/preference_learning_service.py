from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
from collections import defaultdict

from app.models.learned_preferences import (
    LearnedPreferences,
    CategoryPreference,
    PricePreference,
    TimePreference,
    DistancePreference,
    UserBehaviorAnalysis,
    PreferenceInsight,
    InteractionType
)
from app.core.firebase import firebase_service

logger = logging.getLogger(__name__)


class PreferenceLearningService:
    """
    Servicio para aprender preferencias del usuario basado en sus interacciones

    Analiza:
    - Qué categorías de lugares le gustan/evita
    - Rangos de precio preferidos
    - Horarios de exploración preferidos
    - Distancias que acepta caminar
    """

    def __init__(self):
        self.preferences_ref = "learned_preferences"
        self.interactions_ref = "alert_interactions"

    def get_learned_preferences(self, user_id: str) -> Optional[LearnedPreferences]:
        """Obtiene las preferencias aprendidas de un usuario"""
        try:
            db = firebase_service.get_db()
            data = db.child(self.preferences_ref).child(user_id).get().val()

            if not data:
                logger.info(f"No hay preferencias aprendidas para {user_id}")
                return None

            # Convertir datetime strings de vuelta a datetime
            if 'created_at' in data:
                data['created_at'] = datetime.fromisoformat(data['created_at'])
            if 'last_updated' in data:
                data['last_updated'] = datetime.fromisoformat(data['last_updated'])
            if 'last_analyzed' in data and data['last_analyzed']:
                data['last_analyzed'] = datetime.fromisoformat(data['last_analyzed'])

            # Convertir nested dicts de categorías
            if 'categories' in data:
                for cat_key, cat_data in data['categories'].items():
                    if 'last_updated' in cat_data:
                        cat_data['last_updated'] = datetime.fromisoformat(cat_data['last_updated'])

            return LearnedPreferences(**data)

        except Exception as e:
            logger.error(f"Error obteniendo preferencias aprendidas: {str(e)}")
            return None

    def analyze_user_interactions(self, user_id: str) -> LearnedPreferences:
        """
        Analiza todas las interacciones del usuario y actualiza preferencias aprendidas

        Args:
            user_id: ID del usuario

        Returns:
            LearnedPreferences actualizadas
        """
        try:
            logger.info(f"🧠 Analizando interacciones de {user_id}")

            # Obtener todas las interacciones del usuario
            interactions = self._get_user_interactions(user_id)

            if not interactions:
                logger.info(f"No hay interacciones para analizar de {user_id}")
                return self._create_default_preferences(user_id)

            logger.info(f"📊 Encontradas {len(interactions)} interacciones")

            # Obtener preferencias existentes o crear nuevas
            preferences = self.get_learned_preferences(user_id)
            if not preferences:
                preferences = self._create_default_preferences(user_id)

            # Analizar cada tipo de preferencia
            self._analyze_category_preferences(interactions, preferences)
            self._analyze_price_preferences(interactions, preferences)
            self._analyze_time_preferences(interactions, preferences)
            self._analyze_distance_preferences(interactions, preferences)

            # Actualizar estadísticas generales
            self._update_general_stats(interactions, preferences)

            # Actualizar timestamp
            preferences.last_analyzed = datetime.now()
            preferences.last_updated = datetime.now()

            # Guardar en Firebase
            self._save_preferences(preferences)

            logger.info(f"✅ Preferencias actualizadas para {user_id}")
            return preferences

        except Exception as e:
            logger.error(f"❌ Error analizando interacciones: {str(e)}")
            logger.exception(e)
            return self._create_default_preferences(user_id)

    def _analyze_category_preferences(
        self,
        interactions: List[Dict],
        preferences: LearnedPreferences
    ):
        """Analiza preferencias por categoría de lugar"""
        category_stats = defaultdict(lambda: {'positive': 0, 'negative': 0, 'total': 0})

        for interaction in interactions:
            alert_data = interaction.get('alert_data', {})
            place = alert_data.get('place', {})
            categories = place.get('categories', [])
            interaction_type = interaction.get('interaction_type')

            for category in categories:
                category_stats[category]['total'] += 1

                if interaction_type in ['tapped', 'saved']:
                    category_stats[category]['positive'] += 1
                elif interaction_type == 'dismissed':
                    category_stats[category]['negative'] += 1

        # Actualizar preferencias
        for category, stats in category_stats.items():
            if category not in preferences.categories:
                preferences.categories[category] = CategoryPreference(category=category)

            cat_pref = preferences.categories[category]
            cat_pref.positive_interactions = stats['positive']
            cat_pref.negative_interactions = stats['negative']
            cat_pref.total_shown = stats['total']

            # Calcular score: (positivas - negativas) / total
            # Normalizado a 0-1 donde 0.5 es neutral
            if stats['total'] > 0:
                ratio = (stats['positive'] - stats['negative']) / stats['total']
                cat_pref.preference_score = max(0.0, min(1.0, 0.5 + (ratio / 2)))

            cat_pref.last_updated = datetime.now()

        logger.info(f"   📂 Analizadas {len(category_stats)} categorías")

    def _analyze_price_preferences(
        self,
        interactions: List[Dict],
        preferences: LearnedPreferences
    ):
        """Analiza preferencias por nivel de precio"""
        price_stats = defaultdict(lambda: {'positive': 0, 'negative': 0})

        for interaction in interactions:
            alert_data = interaction.get('alert_data', {})
            place = alert_data.get('place', {})
            price_level = place.get('price_level')
            interaction_type = interaction.get('interaction_type')

            if price_level is not None:
                if interaction_type in ['tapped', 'saved']:
                    price_stats[price_level]['positive'] += 1
                elif interaction_type == 'dismissed':
                    price_stats[price_level]['negative'] += 1

        # Actualizar preferencias
        for price_level, stats in price_stats.items():
            if price_level not in preferences.price_levels:
                preferences.price_levels[price_level] = PricePreference(price_level=price_level)

            price_pref = preferences.price_levels[price_level]
            price_pref.positive_interactions = stats['positive']
            price_pref.negative_interactions = stats['negative']

            total = stats['positive'] + stats['negative']
            if total > 0:
                ratio = (stats['positive'] - stats['negative']) / total
                price_pref.preference_score = max(0.0, min(1.0, 0.5 + (ratio / 2)))

        logger.info(f"   💰 Analizados {len(price_stats)} niveles de precio")

    def _analyze_time_preferences(
        self,
        interactions: List[Dict],
        preferences: LearnedPreferences
    ):
        """Analiza preferencias por horario de exploración"""
        time_stats = defaultdict(int)

        for interaction in interactions:
            timestamp_str = interaction.get('timestamp')
            interaction_type = interaction.get('interaction_type')

            # Solo contar interacciones positivas
            if interaction_type not in ['tapped', 'saved']:
                continue

            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                    hour = timestamp.hour

                    # Clasificar en rangos
                    if 6 <= hour < 12:
                        time_range = "morning"
                    elif 12 <= hour < 18:
                        time_range = "afternoon"
                    elif 18 <= hour < 24:
                        time_range = "evening"
                    else:
                        time_range = "night"

                    time_stats[time_range] += 1
                except:
                    pass

        # Actualizar preferencias
        total_time_interactions = sum(time_stats.values())
        for time_range, count in time_stats.items():
            if time_range not in preferences.time_preferences:
                preferences.time_preferences[time_range] = TimePreference(hour_range=time_range)

            time_pref = preferences.time_preferences[time_range]
            time_pref.interaction_count = count

            if total_time_interactions > 0:
                # Score basado en proporción de interacciones en este horario
                time_pref.preference_score = count / total_time_interactions

        logger.info(f"   ⏰ Analizados {len(time_stats)} rangos horarios")

    def _analyze_distance_preferences(
        self,
        interactions: List[Dict],
        preferences: LearnedPreferences
    ):
        """Analiza preferencias por distancia"""
        distance_stats = defaultdict(lambda: {'positive': 0, 'total': 0})

        for interaction in interactions:
            alert_data = interaction.get('alert_data', {})
            distance_meters = alert_data.get('distance_meters', 0)
            interaction_type = interaction.get('interaction_type')

            # Clasificar distancia
            if distance_meters < 100:
                distance_range = "very_close"
            elif distance_meters < 300:
                distance_range = "close"
            elif distance_meters < 500:
                distance_range = "medium"
            else:
                distance_range = "far"

            distance_stats[distance_range]['total'] += 1

            if interaction_type in ['tapped', 'saved']:
                distance_stats[distance_range]['positive'] += 1

        # Actualizar preferencias
        for distance_range, stats in distance_stats.items():
            if distance_range not in preferences.distance_preferences:
                preferences.distance_preferences[distance_range] = DistancePreference(
                    distance_range=distance_range
                )

            dist_pref = preferences.distance_preferences[distance_range]
            dist_pref.positive_interactions = stats['positive']
            dist_pref.total_shown = stats['total']

            if stats['total'] > 0:
                # Score basado en tasa de interacción positiva
                dist_pref.preference_score = stats['positive'] / stats['total']

        logger.info(f"   📏 Analizados {len(distance_stats)} rangos de distancia")

    def _update_general_stats(
        self,
        interactions: List[Dict],
        preferences: LearnedPreferences
    ):
        """Actualiza estadísticas generales"""
        preferences.total_interactions = len(interactions)

        positive = sum(1 for i in interactions if i.get('interaction_type') in ['tapped', 'saved'])
        negative = sum(1 for i in interactions if i.get('interaction_type') == 'dismissed')

        preferences.total_positive_interactions = positive
        preferences.total_negative_interactions = negative

    def generate_behavior_analysis(self, user_id: str) -> UserBehaviorAnalysis:
        """
        Genera análisis completo del comportamiento del usuario

        Returns:
            UserBehaviorAnalysis con insights y métricas
        """
        try:
            preferences = self.get_learned_preferences(user_id)

            if not preferences:
                logger.info(f"Analizando interacciones por primera vez para {user_id}")
                preferences = self.analyze_user_interactions(user_id)

            # Si las preferencias son muy antiguas (>7 días), re-analizar
            if preferences.last_analyzed:
                days_old = (datetime.now() - preferences.last_analyzed).days
                if days_old > 7:
                    logger.info(f"Preferencias antiguas ({days_old} días), re-analizando")
                    preferences = self.analyze_user_interactions(user_id)

            analysis = UserBehaviorAnalysis(user_id=user_id)

            # Top categorías preferidas
            top_cats = sorted(
                [(cat, pref) for cat, pref in preferences.categories.items()],
                key=lambda x: x[1].preference_score,
                reverse=True
            )[:5]

            analysis.top_categories = [
                {"category": cat, "score": pref.preference_score, "interactions": pref.total_shown}
                for cat, pref in top_cats if pref.preference_score > 0.6
            ]

            # Categorías evitadas
            avoided = [
                {"category": cat, "score": pref.preference_score, "dismissed": pref.negative_interactions}
                for cat, pref in preferences.categories.items()
                if pref.preference_score < 0.4 and pref.total_shown >= 3
            ]
            analysis.avoided_categories = avoided

            # Rango de precio preferido
            preferred_prices = [
                price_level for price_level, pref in preferences.price_levels.items()
                if pref.preference_score > 0.6
            ]
            if preferred_prices:
                analysis.preferred_price_range = sorted(preferred_prices)

            # Horarios preferidos
            analysis.preferred_times = [
                time_range for time_range, pref in preferences.time_preferences.items()
                if pref.preference_score > 0.3  # Al menos 30% de interacciones
            ]

            # Distancias preferidas
            analysis.preferred_distances = [
                dist_range for dist_range, pref in preferences.distance_preferences.items()
                if pref.preference_score > 0.5
            ]

            # Calcular métricas
            if preferences.total_interactions > 0:
                analysis.engagement_rate = preferences.total_positive_interactions / preferences.total_interactions
                analysis.dismissal_rate = preferences.total_negative_interactions / preferences.total_interactions

            # Generar insights
            analysis.insights = self._generate_insights(preferences, analysis)

            return analysis

        except Exception as e:
            logger.error(f"Error generando análisis de comportamiento: {str(e)}")
            logger.exception(e)
            return UserBehaviorAnalysis(user_id=user_id)

    def _generate_insights(
        self,
        preferences: LearnedPreferences,
        analysis: UserBehaviorAnalysis
    ) -> List[PreferenceInsight]:
        """Genera insights inteligentes basados en las preferencias"""
        insights = []

        # Insight: Categorías favoritas
        if analysis.top_categories:
            top_cat = analysis.top_categories[0]
            insights.append(PreferenceInsight(
                type="category",
                insight=f"Te encanta visitar lugares de tipo '{top_cat['category']}' (score: {top_cat['score']:.2f})",
                confidence=min(top_cat['score'], 0.95),
                data={"category": top_cat['category'], "score": top_cat['score']}
            ))

        # Insight: Categorías evitadas
        if analysis.avoided_categories:
            avoided_cat = analysis.avoided_categories[0]
            insights.append(PreferenceInsight(
                type="category",
                insight=f"Tiendes a evitar lugares de tipo '{avoided_cat['category']}'",
                confidence=1.0 - avoided_cat['score'],
                data={"category": avoided_cat['category'], "dismissed": avoided_cat['dismissed']}
            ))

        # Insight: Rango de precio
        if analysis.preferred_price_range:
            price_names = {0: "gratis", 1: "económico", 2: "moderado", 3: "caro", 4: "muy caro"}
            price_str = " y ".join([price_names.get(p, str(p)) for p in analysis.preferred_price_range])
            insights.append(PreferenceInsight(
                type="price",
                insight=f"Prefieres lugares {price_str}",
                confidence=0.8,
                data={"price_levels": analysis.preferred_price_range}
            ))

        # Insight: Horario de exploración
        if analysis.preferred_times:
            time_names = {
                "morning": "mañanas",
                "afternoon": "tardes",
                "evening": "noches",
                "night": "madrugadas"
            }
            times_str = " y ".join([time_names.get(t, t) for t in analysis.preferred_times])
            insights.append(PreferenceInsight(
                type="time",
                insight=f"Sueles explorar durante las {times_str}",
                confidence=0.75,
                data={"times": analysis.preferred_times}
            ))

        # Insight: Distancia
        if analysis.preferred_distances:
            if "very_close" in analysis.preferred_distances:
                insights.append(PreferenceInsight(
                    type="distance",
                    insight="Prefieres lugares muy cercanos (menos de 100m)",
                    confidence=0.8,
                    data={"distances": analysis.preferred_distances}
                ))
            elif "far" in analysis.preferred_distances:
                insights.append(PreferenceInsight(
                    type="distance",
                    insight="Estás dispuesto a caminar distancias largas (500m+)",
                    confidence=0.75,
                    data={"distances": analysis.preferred_distances}
                ))

        # Insight: Engagement
        if analysis.engagement_rate > 0.7:
            insights.append(PreferenceInsight(
                type="engagement",
                insight=f"Alta tasa de interacción ({analysis.engagement_rate*100:.0f}%) - las recomendaciones son muy relevantes",
                confidence=0.9,
                data={"rate": analysis.engagement_rate}
            ))
        elif analysis.engagement_rate < 0.3:
            insights.append(PreferenceInsight(
                type="engagement",
                insight=f"Baja tasa de interacción ({analysis.engagement_rate*100:.0f}%) - necesitamos mejorar las recomendaciones",
                confidence=0.85,
                data={"rate": analysis.engagement_rate}
            ))

        return insights

    def get_category_boost(self, user_id: str, category: str) -> float:
        """
        Obtiene el boost de scoring para una categoría específica

        Args:
            user_id: ID del usuario
            category: Categoría a evaluar

        Returns:
            float: Multiplicador para el score (0.5 a 1.5)
                   1.0 = neutral, >1.0 = preferida, <1.0 = evitada
        """
        preferences = self.get_learned_preferences(user_id)

        if not preferences or category not in preferences.categories:
            return 1.0  # Neutral si no hay datos

        cat_pref = preferences.categories[category]

        # Si tiene pocas interacciones, no aplicar boost fuerte
        if cat_pref.total_shown < 3:
            return 1.0

        # Convertir preference_score (0-1) a boost (0.5-1.5)
        # 0.5 = evitar mucho, 1.0 = neutral, 1.5 = preferir mucho
        boost = 0.5 + (cat_pref.preference_score * 1.0)

        return boost

    def get_price_boost(self, user_id: str, price_level: Optional[int]) -> float:
        """Obtiene el boost de scoring para un nivel de precio"""
        if price_level is None:
            return 1.0

        preferences = self.get_learned_preferences(user_id)

        if not preferences or price_level not in preferences.price_levels:
            return 1.0

        price_pref = preferences.price_levels[price_level]

        # Convertir a boost similar a categorías
        boost = 0.5 + (price_pref.preference_score * 1.0)

        return boost

    def _get_user_interactions(self, user_id: str) -> List[Dict]:
        """Obtiene todas las interacciones del usuario desde Firebase"""
        try:
            db = firebase_service.get_db()
            all_interactions = db.child(self.interactions_ref).get().val()

            if not all_interactions:
                return []

            # Filtrar por user_id y obtener también datos de la alerta
            user_interactions = []
            for interaction_id, interaction_data in all_interactions.items():
                if interaction_data.get('user_id') == user_id:
                    # Obtener datos de la alerta completa
                    alert_id = interaction_data.get('alert_id')
                    if alert_id:
                        alert_data = db.child('route_alerts').child(alert_id).get().val()
                        interaction_data['alert_data'] = alert_data or {}

                    user_interactions.append(interaction_data)

            return user_interactions

        except Exception as e:
            logger.error(f"Error obteniendo interacciones: {str(e)}")
            return []

    def _create_default_preferences(self, user_id: str) -> LearnedPreferences:
        """Crea preferencias por defecto para un usuario nuevo"""
        return LearnedPreferences(
            user_id=user_id,
            created_at=datetime.now(),
            last_updated=datetime.now()
        )

    def _save_preferences(self, preferences: LearnedPreferences) -> bool:
        """Guarda preferencias en Firebase"""
        try:
            db = firebase_service.get_db()
            data = preferences.model_dump()

            # Convertir datetime a ISO string
            data['created_at'] = preferences.created_at.isoformat()
            data['last_updated'] = preferences.last_updated.isoformat()
            if preferences.last_analyzed:
                data['last_analyzed'] = preferences.last_analyzed.isoformat()

            # Convertir nested datetime en categorías
            if 'categories' in data:
                for cat_key, cat_data in data['categories'].items():
                    if 'last_updated' in cat_data:
                        cat_data['last_updated'] = cat_data['last_updated'].isoformat() if isinstance(
                            cat_data['last_updated'], datetime
                        ) else cat_data['last_updated']

            db.child(self.preferences_ref).child(preferences.user_id).set(data)

            logger.info(f"✅ Preferencias guardadas para {preferences.user_id}")
            return True

        except Exception as e:
            logger.error(f"Error guardando preferencias: {str(e)}")
            return False


# Instancia global
preference_learning_service = PreferenceLearningService()
