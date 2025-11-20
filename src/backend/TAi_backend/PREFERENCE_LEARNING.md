# 🧠 Sistema de Aprendizaje Automático de Preferencias

## Descripción General

El sistema de aprendizaje automático analiza las interacciones del usuario con las alertas de exploración para mejorar continuamente las recomendaciones. A medida que el usuario acepta, rechaza o guarda lugares, el sistema aprende sus preferencias reales.

## Arquitectura

### Componentes Principales

1. **Modelos de Datos** (`app/models/learned_preferences.py`)
   - `LearnedPreferences`: Almacena preferencias aprendidas
   - `CategoryPreference`: Preferencias por categoría de lugar
   - `PricePreference`: Preferencias por nivel de precio
   - `TimePreference`: Preferencias por horario
   - `DistancePreference`: Preferencias por distancia
   - `UserBehaviorAnalysis`: Análisis completo del comportamiento

2. **Servicio de Aprendizaje** (`app/services/preference_learning_service.py`)
   - Analiza interacciones del usuario
   - Calcula scores de preferencia
   - Genera insights inteligentes
   - Proporciona boosts de scoring

3. **Integración con Alertas** (`app/services/route_alert_service.py`)
   - Aplica preferencias aprendidas al scoring
   - Re-analiza preferencias después de cada interacción
   - Ajusta dinámicamente las recomendaciones

4. **Endpoints API** (`app/api/v1/exploration.py`)
   - `GET /exploration/preferences/insights`: Ver preferencias aprendidas
   - `POST /exploration/preferences/refresh`: Forzar re-análisis

## Flujo de Aprendizaje

```
1. Usuario recibe alerta de lugar
   ↓
2. Usuario interactúa (tapped/saved/dismissed/viewed)
   ↓
3. Interacción se guarda en Firebase
   ↓
4. Sistema re-analiza preferencias automáticamente
   ↓
5. Preferencias actualizadas se usan en próximas alertas
   ↓
6. Score de lugares se ajusta dinámicamente
```

## Tipos de Interacciones

| Tipo | Significado | Impacto en Aprendizaje |
|------|-------------|------------------------|
| `tapped` | Usuario tocó la alerta | ✅ Positivo - aumenta score de categoría/precio |
| `saved` | Usuario guardó el lugar | ✅✅ Muy positivo - fuerte señal de interés |
| `dismissed` | Usuario rechazó la alerta | ❌ Negativo - disminuye score de categoría/precio |
| `viewed` | Usuario vio la alerta | ℹ️ Neutral - solo tracking |

## Cálculo de Scores

### Categorías

```python
preference_score = 0.5 + ((positivas - negativas) / total) / 2

# Ejemplos:
# 8 positivas, 2 negativas de 10 total → 0.5 + (6/10)/2 = 0.8 (preferida)
# 2 positivas, 8 negativas de 10 total → 0.5 + (-6/10)/2 = 0.2 (evitada)
# 5 positivas, 5 negativas de 10 total → 0.5 + (0/10)/2 = 0.5 (neutral)
```

### Aplicación de Boost

```python
boost = 0.5 + (preference_score * 1.0)

# Conversión:
# preference_score = 0.0 → boost = 0.5x (reduce a la mitad)
# preference_score = 0.5 → boost = 1.0x (sin cambio)
# preference_score = 1.0 → boost = 1.5x (aumenta 50%)

adjusted_score = base_score * category_boost * price_boost
```

## Datos Almacenados en Firebase

### Estructura `learned_preferences/{user_id}`

```json
{
  "user_id": "abc123",
  "categories": {
    "restaurant": {
      "category": "restaurant",
      "positive_interactions": 15,
      "negative_interactions": 2,
      "total_shown": 20,
      "preference_score": 0.825,
      "last_updated": "2025-01-15T10:30:00"
    },
    "museum": {
      "category": "museum",
      "positive_interactions": 1,
      "negative_interactions": 8,
      "total_shown": 10,
      "preference_score": 0.15,
      "last_updated": "2025-01-15T09:15:00"
    }
  },
  "price_levels": {
    "1": {
      "price_level": 1,
      "positive_interactions": 12,
      "negative_interactions": 1,
      "preference_score": 0.92
    }
  },
  "time_preferences": {
    "afternoon": {
      "hour_range": "afternoon",
      "interaction_count": 25,
      "preference_score": 0.6
    }
  },
  "distance_preferences": {
    "very_close": {
      "distance_range": "very_close",
      "positive_interactions": 18,
      "total_shown": 20,
      "preference_score": 0.9
    }
  },
  "total_interactions": 45,
  "total_positive_interactions": 32,
  "total_negative_interactions": 13,
  "created_at": "2025-01-10T08:00:00",
  "last_updated": "2025-01-15T10:30:00",
  "last_analyzed": "2025-01-15T10:30:00"
}
```

## Uso de los Endpoints

### 1. Obtener Insights de Preferencias

```bash
GET /api/v1/exploration/preferences/insights
Authorization: Bearer <firebase_token>
```

**Respuesta:**
```json
{
  "user_id": "abc123",
  "top_categories": [
    {
      "category": "restaurant",
      "score": 0.825,
      "interactions": 20
    },
    {
      "category": "cafe",
      "score": 0.75,
      "interactions": 15
    }
  ],
  "avoided_categories": [
    {
      "category": "museum",
      "score": 0.15,
      "dismissed": 8
    }
  ],
  "preferred_price_range": [1, 2],
  "preferred_times": ["afternoon", "evening"],
  "preferred_distances": ["very_close", "close"],
  "engagement_rate": 0.711,
  "dismissal_rate": 0.289,
  "insights": [
    {
      "type": "category",
      "insight": "Te encanta visitar lugares de tipo 'restaurant' (score: 0.83)",
      "confidence": 0.83,
      "data": {
        "category": "restaurant",
        "score": 0.825
      }
    },
    {
      "type": "price",
      "insight": "Prefieres lugares económico y moderado",
      "confidence": 0.8,
      "data": {
        "price_levels": [1, 2]
      }
    }
  ],
  "analyzed_at": "2025-01-15T10:30:00"
}
```

### 2. Forzar Re-análisis

```bash
POST /api/v1/exploration/preferences/refresh
Authorization: Bearer <firebase_token>
```

**Respuesta:**
```json
{
  "status": "success",
  "message": "Preferencias re-analizadas exitosamente",
  "total_interactions": 45,
  "categories_learned": 8,
  "last_updated": "2025-01-15T10:35:00"
}
```

## Integración con Recomendaciones

El sistema se integra automáticamente en:

1. **Alertas de Exploración** (`/exploration/location/update`)
   - Cada lugar candidato pasa por `_analyze_place()`
   - Se aplican boosts de ML en `_apply_learned_preferences()`
   - Score ajustado determina prioridad y orden

2. **Después de Interacciones** (`/exploration/alert/interact`)
   - Cada interacción dispara re-análisis automático
   - Preferencias se actualizan en tiempo real
   - Próximas alertas usan datos actualizados

## Ventajas del Sistema

✅ **Aprendizaje Continuo**: Mejora con cada interacción
✅ **No Intrusivo**: No requiere configuración manual del usuario
✅ **Transparente**: Usuario puede ver qué aprendió el sistema
✅ **Adaptativo**: Se ajusta a cambios de preferencias
✅ **Resiliente**: Fallback a scoring base si hay errores
✅ **Eficiente**: Re-análisis solo con interacciones significativas

## Consideraciones de Privacidad

- Todos los datos se almacenan por `user_id`
- Solo el usuario autenticado puede ver sus preferencias
- Datos anónimos, no compartidos entre usuarios
- Puede resetearse eliminando `learned_preferences/{user_id}`

## Mejoras Futuras Posibles

1. **Pesos Dinámicos**: Ajustar pesos de scoring según engagement
2. **Aprendizaje Temporal**: Detectar cambios de preferencias en el tiempo
3. **Clustering**: Agrupar usuarios con preferencias similares
4. **A/B Testing**: Probar diferentes algoritmos de scoring
5. **Feedback Explícito**: Permitir al usuario indicar por qué rechazó algo
6. **Predicción**: Predecir qué lugares gustarán sin mostrarlos primero

## Métricas de Éxito

- **Engagement Rate**: % de alertas con interacción positiva
- **Dismissal Rate**: % de alertas rechazadas
- **Coverage**: % de categorías con datos suficientes (>3 interacciones)
- **Confidence**: Promedio de confianza de insights generados

## Debugging

### Logs Importantes

```python
# Aplicación de boost
logger.debug(f"⬆️ Boost positivo: 1.3x para ['restaurant', 'cafe']")
logger.debug(f"⬇️ Boost negativo: 0.7x para ['museum']")
logger.debug(f"💰 Penalización por precio nivel 3: 0.6x")

# Re-análisis
logger.info(f"🧠 Preferencias re-analizadas para {user_id}")
logger.info(f"📂 Analizadas 8 categorías")
logger.info(f"💰 Analizados 3 niveles de precio")
```

### Verificar Datos en Firebase

```python
# Firebase Console → Realtime Database
learned_preferences/
  ├── user_abc123/
  │   ├── categories/
  │   ├── price_levels/
  │   └── ...
  └── user_xyz789/

alert_interactions/
  ├── interaction_1/
  │   ├── user_id: "abc123"
  │   ├── alert_id: "alert_001"
  │   ├── interaction_type: "tapped"
  │   └── timestamp: "2025-01-15T10:30:00"
  └── ...
```

## Conclusión

El sistema de aprendizaje automático transforma las interacciones del usuario en mejoras tangibles de las recomendaciones, creando una experiencia cada vez más personalizada sin requerir esfuerzo manual del usuario.
