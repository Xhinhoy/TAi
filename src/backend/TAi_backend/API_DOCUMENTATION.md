# Documentación API - TAi Backend

## Índice
1. [Descripción General](#descripción-general)
2. [Configuración](#configuración)
3. [Autenticación](#autenticación)
4. [Endpoints Principales](#endpoints-principales)
   - [Health Check](#health-check)
   - [Usuarios](#usuarios)
   - [Lugares](#lugares)
   - [Recomendaciones](#recomendaciones)
   - [Itinerarios](#itinerarios)
   - [Chat](#chat)
   - [Caché](#caché)
5. [Modelos de Datos](#modelos-de-datos)
6. [Códigos de Estado](#códigos-de-estado)

---

## Descripción General

TAi Backend es una API RESTful construida con FastAPI que proporciona servicios de recomendaciones turísticas impulsadas por inteligencia artificial. La aplicación integra Firebase para autenticación y almacenamiento, Google Places API para información de lugares, y modelos LLM (Groq) para generar recomendaciones personalizadas.

**Versión:** 1.0.0
**Base URL:** `/api/v1`
**Puerto por defecto:** Configurado en `settings.PORT`

### Tecnologías
- **Framework:** FastAPI
- **Base de datos:** Firebase Realtime Database
- **Autenticación:** Firebase Auth
- **IA/LLM:** Groq
- **APIs externas:** Google Places API

---

## Configuración

### Variables de Entorno
El proyecto requiere las siguientes variables de entorno (archivo `.env`):

```env
# Firebase
FIREBASE_CREDENTIALS_PATH=ruta/al/archivo.json

# Groq (LLM)
GROQ_API_KEY=tu_api_key
GROQ_MODEL=modelo_a_usar

# Google Places
GOOGLE_PLACES_API_KEY=tu_api_key

# Configuración
PORT=8000
DEBUG=True
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Inicialización
La aplicación inicializa Firebase automáticamente al arrancar mediante el evento `lifespan`:

```python
# app/main.py:18-27
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Iniciando aplicación...")
    firebase_service.initialize()
    logger.info("Firebase inicializado correctamente")

    yield

    # Shutdown
    logger.info("Cerrando aplicación...")
```

### CORS
La aplicación está configurada con CORS para permitir peticiones desde orígenes especificados en `settings.cors_origins_list`.

---

## Autenticación

Todos los endpoints (excepto `/`, `/health` y `/docs`) requieren autenticación mediante Firebase Auth.

### Header requerido
```
Authorization: Bearer <firebase_id_token>
```

### Implementación
La autenticación se maneja mediante el dependency `get_current_user` en `app/api/deps.py`:

```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    # Verifica el token de Firebase
    # Retorna información del usuario autenticado
```

### Errores de autenticación
- **401 Unauthorized:** Token inválido o expirado
- **403 Forbidden:** Usuario no autorizado para acceder al recurso

---

## Endpoints Principales

### Health Check

#### `GET /`
Endpoint raíz de la API.

**Respuesta exitosa (200):**
```json
{
  "message": "TAi Backend API",
  "version": "1.0.0",
  "status": "running"
}
```

#### `GET /health`
Verifica el estado de salud de la API y sus servicios.

**Respuesta exitosa (200):**
```json
{
  "status": "healthy",
  "firebase": "connected",
  "llm": "Groq (modelo_usado)"
}
```

---

## Usuarios

Todos los endpoints de usuarios están bajo el prefijo `/api/v1/users`.

### `GET /users/{uid}/profile`
Obtiene el perfil completo de un usuario.

**Parámetros:**
- `uid` (path, requerido): ID único del usuario en Firebase

**Autenticación:**
- El usuario solo puede acceder a su propio perfil (`current_user['uid'] == uid`)

**Respuesta exitosa (200):**
```json
{
  "uid": "firebase_user_id",
  "display_name": "Juan Pérez",
  "email": "juan@example.com",
  "photo_url": "https://...",
  "location": "Santiago, Chile",
  "language": "es",
  "timezone": "America/Santiago",
  "interests": ["aventura", "cultura", "gastronomía"],
  "preferences": {
    "budget": {
      "min": 50.0,
      "max": 200.0,
      "currency": "USD"
    },
    "travel_style": "aventurero",
    "group_size": "pareja",
    "transport_preference": ["publico", "caminata"],
    "accessibility": {
      "mobility_assistance": false,
      "visual_assistance": false,
      "hearing_assistance": false
    },
    "notifications": {
      "recommendations": true,
      "price_alerts": true,
      "weather_updates": true,
      "event_reminders": true
    }
  },
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-20T15:45:00"
}
```

**Errores:**
- **403:** Usuario no autorizado
- **404:** Perfil no encontrado

**Implementación:** `app/api/v1/users.py:9-17`

---

### `PUT /users/{uid}/profile`
Actualiza el perfil de un usuario.

**Parámetros:**
- `uid` (path, requerido): ID único del usuario

**Body (JSON):**
```json
{
  "display_name": "Juan Carlos Pérez",
  "location": "Valparaíso, Chile",
  "language": "es",
  "timezone": "America/Santiago",
  "interests": ["aventura", "cultura", "gastronomía", "naturaleza"],
  "preferences": {
    "budget": {
      "min": 75.0,
      "max": 250.0,
      "currency": "USD"
    },
    "travel_style": "aventurero",
    "group_size": "familia"
  }
}
```

**Nota:** Todos los campos del body son opcionales. Solo se actualizan los campos enviados.

**Respuesta exitosa (200):**
Retorna el perfil completo actualizado (mismo formato que GET).

**Errores:**
- **403:** Usuario no autorizado
- **404:** Perfil no encontrado

**Implementación:** `app/api/v1/users.py:19-31`

---

### `PATCH /users/{uid}/interests`
Actualiza específicamente los intereses del usuario.

**Parámetros:**
- `uid` (path, requerido): ID único del usuario

**Body (JSON):**
```json
{
  "interests": ["aventura", "cultura", "gastronomía", "historia", "naturaleza"]
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "interests": ["aventura", "cultura", "gastronomía", "historia", "naturaleza"]
}
```

**Errores:**
- **403:** Usuario no autorizado

**Implementación:** `app/api/v1/users.py:33-43`

---

### `GET /users/{uid}/favorites`
Obtiene la lista de lugares favoritos del usuario.

**Parámetros:**
- `uid` (path, requerido): ID único del usuario

**Respuesta exitosa (200):**
```json
{
  "favorites": [
    {
      "place_id": "ChIJ...",
      "name": "Plaza de Armas",
      "coords": {
        "latitude": -33.4372,
        "longitude": -70.6506
      },
      "rating": 4.5,
      "address": "Plaza de Armas, Santiago",
      "photos": ["https://..."],
      "added_at": "2024-01-15T10:30:00"
    }
  ]
}
```

**Errores:**
- **403:** Usuario no autorizado

**Implementación:** `app/api/v1/users.py:45-51`

---

### `POST /users/{uid}/favorites`
Agrega un lugar a los favoritos del usuario.

**Parámetros:**
- `uid` (path, requerido): ID único del usuario

**Body (JSON):**
```json
{
  "place_id": "ChIJ...",
  "place_data": {
    "name": "Cerro San Cristóbal",
    "coords": {
      "latitude": -33.4256,
      "longitude": -70.6344
    },
    "rating": 4.7,
    "address": "Pío Nono, Santiago",
    "photos": ["https://..."],
    "categories": ["naturaleza", "mirador"]
  }
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "place_id": "ChIJ..."
}
```

**Errores:**
- **403:** Usuario no autorizado

**Implementación:** `app/api/v1/users.py:53-64`

---

### `DELETE /users/{uid}/favorites/{place_id}`
Elimina un lugar de los favoritos del usuario.

**Parámetros:**
- `uid` (path, requerido): ID único del usuario
- `place_id` (path, requerido): ID del lugar a eliminar

**Respuesta exitosa (200):**
```json
{
  "success": true
}
```

**Errores:**
- **403:** Usuario no autorizado

**Implementación:** `app/api/v1/users.py:66-76`

---

## Lugares

Todos los endpoints de lugares están bajo el prefijo `/api/v1/places`.

### `GET /places/search`
Busca lugares cerca de una ubicación específica.

**Parámetros de Query:**
- `q` (opcional): Texto de búsqueda (ej: "restaurantes", "museos")
- `lat` (requerido): Latitud del punto de búsqueda
- `lng` (requerido): Longitud del punto de búsqueda
- `radius` (opcional, default: 5000): Radio de búsqueda en metros
- `place_type` (opcional): Tipo de lugar (ej: "restaurant", "museum", "park")

**Ejemplo de petición:**
```
GET /api/v1/places/search?lat=-33.4372&lng=-70.6506&radius=3000&q=restaurantes&place_type=restaurant
```

**Respuesta exitosa (200):**
```json
[
  {
    "id": "ChIJ...",
    "name": "Restaurante Central",
    "coords": {
      "latitude": -33.4372,
      "longitude": -70.6506
    },
    "rating": 4.5,
    "address": "Merced 297, Santiago",
    "price_level": 3,
    "photos": [
      "https://maps.googleapis.com/maps/api/place/photo?..."
    ],
    "source": "google",
    "categories": ["restaurant", "fine_dining"],
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-20T15:45:00"
  }
]
```

**Funcionamiento interno:**
1. Construye objeto `PlaceSearchParams` con los parámetros recibidos
2. Llama a `place_service.search_places()` que:
   - Verifica caché en Firebase
   - Si no hay caché, consulta Google Places API
   - Guarda resultados en caché
   - Retorna lugares encontrados

**Implementación:** `app/api/v1/places.py:9-26`

---

### `GET /places/{place_id}`
Obtiene detalles completos de un lugar específico.

**Parámetros:**
- `place_id` (path, requerido): ID del lugar (generalmente de Google Places)

**Respuesta exitosa (200):**
```json
{
  "id": "ChIJ...",
  "name": "Museo de Bellas Artes",
  "coords": {
    "latitude": -33.4349,
    "longitude": -70.6416
  },
  "rating": 4.6,
  "address": "José Miguel de la Barra 650, Santiago",
  "price_level": 1,
  "photos": ["https://..."],
  "source": "google",
  "categories": ["museum", "art_gallery"],
  "phone": "+56 2 2499 1600",
  "website": "https://www.mnba.cl",
  "opening_hours": {
    "open_now": true,
    "weekday_text": [
      "Lunes: Cerrado",
      "Martes: 10:00 - 18:45",
      "Miércoles: 10:00 - 18:45"
    ]
  },
  "reviews_count": 1234,
  "reviews": [
    {
      "author": "Usuario 1",
      "rating": 5,
      "text": "Excelente museo...",
      "time": "2024-01-10T14:30:00"
    }
  ],
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-20T15:45:00"
}
```

**Errores:**
- **404:** Lugar no encontrado

**Funcionamiento interno:**
1. Llama a `place_service.get_place_details(place_id)`
2. Verifica caché en Firebase
3. Si no hay caché, consulta Google Places API (Details)
4. Procesa información adicional (horarios, reseñas, contacto)
5. Guarda en caché y retorna

**Implementación:** `app/api/v1/places.py:28-36`

---

### `GET /places/by-category/`
Busca lugares por categorías específicas.

**Parámetros de Query:**
- `categories` (requerido): Categorías separadas por coma (ej: "restaurant,cafe,bar")
- `limit` (opcional, default: 20): Número máximo de resultados

**Ejemplo de petición:**
```
GET /api/v1/places/by-category/?categories=museum,art_gallery,tourist_attraction&limit=10
```

**Respuesta exitosa (200):**
Retorna array de lugares con el mismo formato que `/places/search`.

**Funcionamiento interno:**
1. Divide el string de categorías en una lista
2. Consulta Firebase buscando lugares que coincidan con las categorías
3. Limita resultados según el parámetro `limit`
4. Retorna lista ordenada por relevancia/rating

**Implementación:** `app/api/v1/places.py:38-46`

---

## Recomendaciones

Todos los endpoints de recomendaciones están bajo el prefijo `/api/v1/recommendations`.

### `POST /recommendations/generate`
Genera recomendaciones personalizadas de lugares para un usuario utilizando IA.

**Body (JSON):**
```json
{
  "user_id": "firebase_user_id",
  "location": {
    "latitude": -33.4372,
    "longitude": -70.6506
  },
  "preferences": {
    "interests": ["cultura", "gastronomía", "historia"],
    "budget": {
      "min": 50,
      "max": 150,
      "currency": "USD"
    },
    "time_of_day": "afternoon"
  },
  "limit": 10
}
```

**Nota:** Los campos `location`, `preferences` y `limit` son opcionales. Si no se envían:
- `location`: Usa la ubicación del perfil del usuario
- `preferences`: Usa las preferencias guardadas en el perfil
- `limit`: Por defecto es 10

**Respuesta exitosa (200):**
```json
{
  "recommendations": [
    {
      "place": {
        "id": "ChIJ...",
        "name": "Museo de la Memoria",
        "coords": {
          "latitude": -33.4403,
          "longitude": -70.6506
        },
        "rating": 4.8,
        "address": "Matucana 501, Santiago",
        "price_level": 0,
        "photos": ["https://..."],
        "source": "google",
        "categories": ["museum", "history"]
      },
      "score": 0.95,
      "reasoning": "Este museo se alinea perfectamente con tu interés en historia y cultura. Es gratuito, lo que se ajusta a tu presupuesto. Ubicado cerca de tu ubicación actual.",
      "match_interests": ["historia", "cultura"]
    },
    {
      "place": {
        "id": "ChIJ...",
        "name": "Mercado Central",
        "coords": {
          "latitude": -33.4345,
          "longitude": -70.6502
        },
        "rating": 4.3,
        "address": "San Pablo 967, Santiago",
        "price_level": 2,
        "photos": ["https://..."],
        "source": "google",
        "categories": ["restaurant", "seafood"]
      },
      "score": 0.89,
      "reasoning": "Combina gastronomía y cultura local. Precios moderados dentro de tu rango. Excelente para almuerzo o cena.",
      "match_interests": ["gastronomía", "cultura"]
    }
  ],
  "reasoning": "Las recomendaciones se basan en tus intereses en cultura, gastronomía e historia. He seleccionado lugares cercanos a tu ubicación que se ajustan a tu presupuesto y que ofrecen experiencias auténticas de Santiago."
}
```

**Errores:**
- **403:** Usuario no autorizado (el `user_id` no coincide con el usuario autenticado)

**Funcionamiento interno:**
1. Valida que el usuario autenticado coincida con `user_id`
2. Obtiene perfil del usuario desde Firebase
3. Busca lugares cercanos usando Google Places API
4. Envía información de lugares + perfil de usuario al LLM (Groq)
5. El LLM analiza y puntúa cada lugar según:
   - Coincidencia con intereses del usuario
   - Ajuste al presupuesto
   - Distancia y accesibilidad
   - Rating y calidad
6. Retorna lista ordenada por score con razonamiento

**Implementación:** `app/api/v1/recommendations.py:8-16`

**Servicio relacionado:** `app/services/recommendation_service.py`

---

## Itinerarios

Todos los endpoints de itinerarios están bajo el prefijo `/api/v1/itineraries`.

### `GET /itineraries/{user_id}`
Obtiene todos los itinerarios de un usuario.

**Parámetros:**
- `user_id` (path, requerido): ID del usuario

**Respuesta exitosa (200):**
```json
[
  {
    "id": "itinerary_123",
    "title": "3 días en Santiago",
    "city": "Santiago",
    "days": 3,
    "items": [
      {
        "day": 1,
        "place_id": "ChIJ...",
        "start": "09:00",
        "end": "12:00",
        "notes": "Visita guiada al Museo"
      },
      {
        "day": 1,
        "place_id": "ChIJ...",
        "start": "13:00",
        "end": "15:00",
        "notes": "Almuerzo en Mercado Central"
      }
    ],
    "owner_uid": "firebase_user_id",
    "score": 4.5,
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-20T15:45:00"
  }
]
```

**Errores:**
- **403:** Usuario no autorizado

**Implementación:** `app/api/v1/itineraries.py:9-18`

---

### `POST /itineraries/{user_id}`
Crea un nuevo itinerario manualmente.

**Parámetros:**
- `user_id` (path, requerido): ID del usuario

**Body (JSON):**
```json
{
  "title": "Fin de semana en Valparaíso",
  "city": "Valparaíso",
  "days": 2,
  "items": [
    {
      "day": 1,
      "place_id": "ChIJ...",
      "start": "10:00",
      "end": "12:00",
      "notes": "Recorrer Cerro Alegre"
    },
    {
      "day": 1,
      "place_id": "ChIJ...",
      "start": "14:00",
      "end": "17:00",
      "notes": "Museo a cielo abierto"
    },
    {
      "day": 2,
      "place_id": "ChIJ...",
      "start": "11:00",
      "end": "13:00",
      "notes": "Almuerzo con vista al mar"
    }
  ]
}
```

**Respuesta exitosa (200):**
Retorna el itinerario completo creado (mismo formato que GET).

**Errores:**
- **403:** Usuario no autorizado

**Funcionamiento interno:**
1. Valida permisos del usuario
2. Crea documento en Firebase bajo `itineraries/`
3. Asocia el itinerario al usuario
4. Retorna itinerario con ID generado

**Implementación:** `app/api/v1/itineraries.py:20-30`

---

### `PUT /itineraries/{itinerary_id}`
Actualiza un itinerario existente.

**Parámetros:**
- `itinerary_id` (path, requerido): ID del itinerario a actualizar

**Body (JSON):**
```json
{
  "title": "Fin de semana largo en Valparaíso",
  "city": "Valparaíso",
  "days": 3,
  "items": [
    {
      "day": 1,
      "place_id": "ChIJ...",
      "start": "10:00",
      "end": "12:00",
      "notes": "Recorrer Cerro Alegre y Concepción"
    }
  ]
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true
}
```

**Funcionamiento interno:**
1. Busca el itinerario en Firebase
2. Actualiza campos modificados
3. Actualiza timestamp `updated_at`
4. Retorna confirmación

**Implementación:** `app/api/v1/itineraries.py:32-39`

---

### `DELETE /itineraries/{itinerary_id}`
Elimina un itinerario.

**Parámetros:**
- `itinerary_id` (path, requerido): ID del itinerario a eliminar

**Respuesta exitosa (200):**
```json
{
  "success": true
}
```

**Implementación:** `app/api/v1/itineraries.py:41-47`

---

### `POST /itineraries/generate`
Genera un itinerario automáticamente usando IA.

**Body (JSON):**
```json
{
  "user_id": "firebase_user_id",
  "city": "Santiago",
  "days": 3,
  "start_date": "2024-02-15",
  "preferences": {
    "interests": ["cultura", "gastronomía", "naturaleza"],
    "budget": {
      "min": 50,
      "max": 200,
      "currency": "USD"
    },
    "pace": "relajado",
    "avoid": ["lugares muy concurridos"]
  }
}
```

**Nota:**
- `start_date` es opcional
- `preferences` es opcional (usa perfil del usuario si no se envía)

**Respuesta exitosa (200):**
```json
{
  "id": "generated_itinerary_456",
  "title": "3 días descubriendo Santiago",
  "city": "Santiago",
  "days": 3,
  "items": [
    {
      "day": 1,
      "place_id": "ChIJ...",
      "start": "09:00",
      "end": "11:30",
      "notes": "Comienza tu día explorando el Cerro Santa Lucía. Excelentes vistas de la ciudad y menos concurrido por la mañana."
    },
    {
      "day": 1,
      "place_id": "ChIJ...",
      "start": "12:00",
      "end": "14:00",
      "notes": "Almuerzo en el Mercado Central. Prueba los mariscos frescos."
    },
    {
      "day": 1,
      "place_id": "ChIJ...",
      "start": "15:00",
      "end": "17:30",
      "notes": "Visita el Museo de Bellas Artes. Entrada gratuita y ambiente tranquilo."
    },
    {
      "day": 2,
      "place_id": "ChIJ...",
      "start": "10:00",
      "end": "13:00",
      "notes": "Sube al Cerro San Cristóbal. Naturaleza y vistas panorámicas."
    }
  ],
  "owner_uid": "firebase_user_id",
  "score": 4.7,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

**Errores:**
- **403:** Usuario no autorizado

**Funcionamiento interno:**
1. Valida permisos del usuario
2. Obtiene perfil del usuario
3. Busca lugares relevantes en la ciudad usando Google Places
4. Envía al LLM (Groq) con prompt especializado en generación de itinerarios
5. El LLM organiza los lugares en un itinerario coherente considerando:
   - Proximidad geográfica (minimizar desplazamientos)
   - Horarios lógicos (desayuno, almuerzo, cena)
   - Balance de actividades
   - Intereses del usuario
   - Presupuesto
   - Ritmo deseado (relajado/intenso)
6. Guarda el itinerario en Firebase
7. Retorna itinerario completo

**Implementación:** `app/api/v1/itineraries.py:49-58`

**Servicio relacionado:** `app/services/itinerary_service.py`

---

## Chat

Todos los endpoints de chat están bajo el prefijo `/api/v1/chat`.

### `POST /chat/message`
Envía un mensaje al agente de IA y recibe una respuesta.

**Body (JSON):**
```json
{
  "user_id": "firebase_user_id",
  "session_id": "session_abc123",
  "message": "¿Qué lugares me recomiendas para visitar mañana?",
  "context": {
    "current_location": {
      "latitude": -33.4372,
      "longitude": -70.6506
    }
  }
}
```

**Nota:**
- `session_id` identifica la conversación (mantiene contexto entre mensajes)
- `context` es opcional y puede incluir información adicional relevante

**Respuesta exitosa (200):**
```json
{
  "response": "Basándome en tu ubicación actual cerca del centro de Santiago y tus intereses en cultura y gastronomía, te recomiendo:\n\n1. **Museo de la Memoria** - Un lugar impactante para aprender sobre la historia reciente de Chile\n2. **Mercado Central** - Perfecto para almorzar y probar mariscos frescos\n3. **Barrio Lastarria** - Zona bohemia con cafés, galerías y el cerro Santa Lucía\n\n¿Te gustaría que genere un itinerario detallado con estos lugares?",
  "actions": [
    {
      "type": "search_places",
      "data": {
        "query": "museos cerca",
        "location": {
          "latitude": -33.4372,
          "longitude": -70.6506
        },
        "radius": 3000
      }
    },
    {
      "type": "suggest_itinerary",
      "data": {
        "places": ["ChIJ...", "ChIJ...", "ChIJ..."],
        "duration_hours": 6
      }
    }
  ],
  "places": [
    {
      "id": "ChIJ...",
      "name": "Museo de la Memoria",
      "coords": {
        "latitude": -33.4403,
        "longitude": -70.6506
      },
      "rating": 4.8,
      "address": "Matucana 501, Santiago",
      "photos": ["https://..."],
      "source": "google",
      "categories": ["museum", "history"]
    },
    {
      "id": "ChIJ...",
      "name": "Mercado Central",
      "coords": {
        "latitude": -33.4345,
        "longitude": -70.6502
      },
      "rating": 4.3,
      "address": "San Pablo 967, Santiago",
      "photos": ["https://..."],
      "source": "google",
      "categories": ["restaurant", "market"]
    }
  ]
}
```

**Errores:**
- **403:** Usuario no autorizado

**Funcionamiento interno:**
1. Valida permisos del usuario
2. Recupera historial de conversación de Firebase usando `session_id`
3. Obtiene perfil del usuario para contexto personalizado
4. Construye prompt con:
   - Historial de mensajes
   - Perfil del usuario (intereses, preferencias)
   - Contexto actual (ubicación, hora del día)
   - Mensaje nuevo
5. Envía al LLM (Groq) con herramientas disponibles:
   - `search_places`: Buscar lugares
   - `get_place_details`: Obtener detalles de un lugar
   - `create_itinerary`: Generar itinerario
   - `get_recommendations`: Obtener recomendaciones personalizadas
6. El LLM puede llamar a estas herramientas (function calling)
7. Ejecuta las herramientas solicitadas por el LLM
8. Retorna respuesta final con:
   - Texto de respuesta
   - Acciones realizadas
   - Lugares relevantes encontrados
9. Guarda el intercambio en Firebase para mantener historial

**Implementación:** `app/api/v1/chat.py:10-19`

**Servicio relacionado:** `app/services/chat_service.py`

---

### `GET /chat/history/{session_id}`
Obtiene el historial de una conversación.

**Parámetros:**
- `session_id` (path, requerido): ID de la sesión de chat
- `limit` (query, opcional, default: 50): Número máximo de mensajes a retornar

**Ejemplo de petición:**
```
GET /api/v1/chat/history/session_abc123?limit=20
```

**Respuesta exitosa (200):**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hola, estoy buscando lugares para visitar en Santiago",
      "timestamp": "2024-01-15T10:30:00"
    },
    {
      "role": "assistant",
      "content": "¡Hola! Encantado de ayudarte. Basándome en tu perfil, veo que te interesan la cultura y la gastronomía. ¿Cuántos días estarás en Santiago?",
      "timestamp": "2024-01-15T10:30:05"
    },
    {
      "role": "user",
      "content": "Estaré 3 días",
      "timestamp": "2024-01-15T10:31:00"
    },
    {
      "role": "assistant",
      "content": "Perfecto, 3 días es un buen tiempo. Te recomiendo...",
      "timestamp": "2024-01-15T10:31:10"
    }
  ]
}
```

**Funcionamiento interno:**
1. Consulta Firebase en `chat_history/{session_id}/messages`
2. Ordena mensajes por timestamp (más reciente primero)
3. Limita resultados según parámetro `limit`
4. Retorna lista de mensajes

**Implementación:** `app/api/v1/chat.py:21-28`

---

### `WebSocket /chat/ws/{user_id}/{session_id}`
Conexión WebSocket para chat en tiempo real.

**Parámetros:**
- `user_id` (path, requerido): ID del usuario
- `session_id` (path, requerido): ID de la sesión de chat

**Conexión:**
```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/chat/ws/user123/session_abc');

ws.onopen = () => {
  console.log('Conectado');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Respuesta:', data.response);
  console.log('Acciones:', data.actions);
  console.log('Lugares:', data.places);
};

// Enviar mensaje
ws.send(JSON.stringify({
  message: '¿Qué restaurantes me recomiendas?'
}));
```

**Formato de mensaje enviado:**
```json
{
  "message": "¿Qué restaurantes me recomiendas cerca del centro?"
}
```

**Formato de respuesta recibida:**
```json
{
  "response": "Te recomiendo estos restaurantes cerca del centro...",
  "actions": [
    {
      "type": "search_places",
      "data": {
        "query": "restaurantes",
        "location": {...}
      }
    }
  ],
  "places": [
    {
      "id": "ChIJ...",
      "name": "Restaurante Ejemplo",
      "coords": {...},
      "rating": 4.5
    }
  ]
}
```

**Funcionamiento:**
1. Cliente establece conexión WebSocket
2. Servidor acepta conexión con `await websocket.accept()`
3. Entra en loop esperando mensajes
4. Por cada mensaje recibido:
   - Crea objeto `ChatRequest`
   - Llama a `chat_service.send_message()`
   - Envía respuesta en tiempo real vía WebSocket
5. Si el cliente se desconecta, se captura `WebSocketDisconnect` y se cierra limpiamente

**Ventajas sobre POST /chat/message:**
- Comunicación bidireccional en tiempo real
- Menor latencia
- Permite streaming de respuestas (futuras implementaciones)
- Mantiene conexión abierta para múltiples mensajes

**Implementación:** `app/api/v1/chat.py:30-54`

---

## Caché

Todos los endpoints de caché están bajo el prefijo `/api/v1/cache`.

### `DELETE /cache/clear/{prefix}`
Limpia todas las entradas de caché con un prefijo específico.

**Parámetros:**
- `prefix` (path, requerido): Prefijo del caché a limpiar (ej: "places", "google_places", "tripadvisor")

**Ejemplo de petición:**
```
DELETE /api/v1/cache/clear/google_places
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "prefix": "google_places",
  "message": "Caché de google_places limpiado"
}
```

**Uso común:**
- `places`: Caché general de lugares
- `google_places`: Respuestas de Google Places API
- `tripadvisor`: Datos de TripAdvisor (si aplica)

**Implementación:** `app/api/v1/cache.py:8-18`

---

### `DELETE /cache/clean-expired/{prefix}`
Elimina solo las entradas de caché expiradas de un prefijo específico.

**Parámetros:**
- `prefix` (path, requerido): Prefijo del caché a limpiar

**Ejemplo de petición:**
```
DELETE /api/v1/cache/clean-expired/google_places
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "deleted_count": 47,
  "message": "47 entradas expiradas eliminadas"
}
```

**Funcionamiento interno:**
1. Itera sobre todas las entradas con el prefijo dado
2. Verifica el campo `expires_at` de cada entrada
3. Compara con la fecha/hora actual
4. Elimina las entradas donde `expires_at < now()`
5. Retorna conteo de entradas eliminadas

**Implementación:** `app/api/v1/cache.py:20-30`

---

### `GET /cache/stats`
Obtiene estadísticas del sistema de caché.

**Respuesta exitosa (200):**
```json
{
  "stats": {
    "places": {
      "entries": 234,
      "prefix": "places"
    },
    "google_places": {
      "entries": 1567,
      "prefix": "google_places"
    },
    "tripadvisor": {
      "entries": 89,
      "prefix": "tripadvisor"
    }
  },
  "total_entries": 1890
}
```

**Si hay error en algún prefijo:**
```json
{
  "stats": {
    "places": {
      "entries": 234,
      "prefix": "places"
    },
    "google_places": {
      "entries": 0,
      "prefix": "google_places",
      "error": "No se pudo obtener estadísticas"
    }
  },
  "total_entries": 234
}
```

**Funcionamiento interno:**
1. Define lista de prefijos a monitorear: `['places', 'google_places', 'tripadvisor']`
2. Para cada prefijo:
   - Consulta Firebase en `cache/{prefix}`
   - Cuenta número de entradas
   - Maneja errores si el prefijo no existe
3. Calcula total sumando todas las entradas
4. Retorna objeto con estadísticas

**Uso común:**
- Monitoreo del uso de caché
- Identificar qué APIs se usan más
- Decidir cuándo hacer limpieza

**Implementación:** `app/api/v1/cache.py:32-63`

---

## Modelos de Datos

### UserProfile
```python
{
  "uid": str,                    # ID único de Firebase
  "display_name": str,           # Nombre para mostrar
  "email": str,                  # Email del usuario
  "photo_url": str | None,       # URL de foto de perfil
  "location": str,               # Ubicación (ciudad/país)
  "language": str,               # Código de idioma (ej: "es", "en")
  "timezone": str,               # Zona horaria (ej: "America/Santiago")
  "interests": List[str],        # Lista de intereses
  "preferences": UserPreferences | None,
  "created_at": datetime | None,
  "updated_at": datetime | None
}
```

### UserPreferences
```python
{
  "budget": {
    "min": float,
    "max": float,
    "currency": str
  },
  "travel_style": str,           # Ej: "aventurero", "relajado", "cultural"
  "group_size": str,             # Ej: "solo", "pareja", "familia", "grupo"
  "transport_preference": List[str],  # Ej: ["publico", "auto", "caminata"]
  "accessibility": {
    "mobility_assistance": bool,
    "visual_assistance": bool,
    "hearing_assistance": bool
  },
  "notifications": {
    "recommendations": bool,
    "price_alerts": bool,
    "weather_updates": bool,
    "event_reminders": bool
  }
}
```

### Place
```python
{
  "id": str,                     # ID único (generalmente de Google Places)
  "name": str,                   # Nombre del lugar
  "coords": {
    "latitude": float,
    "longitude": float
  },
  "rating": float | None,        # Calificación (0-5)
  "address": str | None,         # Dirección completa
  "price_level": int | None,     # Nivel de precios (0-4)
  "photos": List[str],           # URLs de fotos
  "source": str,                 # Fuente de datos (ej: "google", "tripadvisor")
  "categories": List[str],       # Categorías/tipos
  "created_at": datetime | None,
  "updated_at": datetime | None
}
```

### PlaceDetails (extiende Place)
```python
{
  ...Place,
  "phone": str | None,
  "website": str | None,
  "opening_hours": dict | None,  # Información de horarios
  "reviews_count": int,
  "reviews": List[dict]          # Lista de reseñas
}
```

### Itinerary
```python
{
  "id": str | None,
  "title": str,                  # Título del itinerario
  "city": str,                   # Ciudad
  "days": int,                   # Número de días
  "items": List[ItineraryItem],
  "owner_uid": str,              # Usuario propietario
  "score": float | None,         # Puntuación de calidad (opcional)
  "created_at": datetime | None,
  "updated_at": datetime | None
}
```

### ItineraryItem
```python
{
  "day": int,                    # Día del itinerario (1, 2, 3...)
  "place_id": str,               # ID del lugar a visitar
  "start": str,                  # Hora de inicio (formato "HH:MM")
  "end": str,                    # Hora de fin (formato "HH:MM")
  "notes": str | None            # Notas adicionales
}
```

### ChatMessage
```python
{
  "role": str,                   # "user" o "assistant"
  "content": str,                # Contenido del mensaje
  "timestamp": datetime | None
}
```

### ChatRequest
```python
{
  "user_id": str,
  "session_id": str,             # ID de sesión para mantener contexto
  "message": str,
  "context": dict | None         # Contexto adicional (ubicación, etc.)
}
```

### ChatResponse
```python
{
  "response": str,               # Respuesta del asistente
  "actions": List[ChatAction],   # Acciones realizadas
  "places": List[Place]          # Lugares relevantes mencionados
}
```

### ChatAction
```python
{
  "type": str,                   # Tipo de acción realizada
  "data": dict                   # Datos de la acción
}
```

**Tipos de acciones comunes:**
- `search_places`: Búsqueda de lugares
- `get_place_details`: Obtener detalles de lugar
- `create_itinerary`: Generar itinerario
- `get_recommendations`: Obtener recomendaciones
- `add_favorite`: Agregar a favoritos
- `update_preferences`: Actualizar preferencias

---

## Códigos de Estado

### Códigos de éxito
- **200 OK**: Petición exitosa
- **201 Created**: Recurso creado exitosamente

### Códigos de error del cliente
- **400 Bad Request**: Datos de entrada inválidos
- **401 Unauthorized**: Token de autenticación inválido o ausente
- **403 Forbidden**: Usuario no autorizado para acceder al recurso
- **404 Not Found**: Recurso no encontrado

### Códigos de error del servidor
- **500 Internal Server Error**: Error interno del servidor
- **503 Service Unavailable**: Servicio temporalmente no disponible

### Formato de error
Todos los errores siguen este formato:

```json
{
  "detail": "Descripción del error"
}
```

**Ejemplos:**

```json
// 401 Unauthorized
{
  "detail": "Token inválido o expirado"
}

// 403 Forbidden
{
  "detail": "No autorizado"
}

// 404 Not Found
{
  "detail": "Perfil no encontrado"
}
```

---

## Ejemplos de Uso

### Flujo completo: Usuario obtiene recomendaciones y crea itinerario

#### 1. Autenticación
```bash
# Primero, el usuario se autentica con Firebase (frontend)
# Obtiene un ID token que usará en todas las peticiones
```

#### 2. Obtener perfil
```bash
curl -X GET "http://localhost:8000/api/v1/users/user123/profile" \
  -H "Authorization: Bearer <firebase_token>"
```

#### 3. Generar recomendaciones
```bash
curl -X POST "http://localhost:8000/api/v1/recommendations/generate" \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "location": {
      "latitude": -33.4372,
      "longitude": -70.6506
    },
    "limit": 10
  }'
```

#### 4. Generar itinerario automático
```bash
curl -X POST "http://localhost:8000/api/v1/itineraries/generate" \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "city": "Santiago",
    "days": 3,
    "start_date": "2024-02-15"
  }'
```

#### 5. Chat con el asistente
```bash
curl -X POST "http://localhost:8000/api/v1/chat/message" \
  -H "Authorization: Bearer <firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "session_id": "session_abc",
    "message": "¿Puedes darme más detalles sobre el Museo de la Memoria?"
  }'
```

---

## Notas de Implementación

### Sistema de Caché
El proyecto implementa un sistema de caché en Firebase Realtime Database para optimizar llamadas a APIs externas:

- **Duración:** Configurable por tipo de dato
- **Estructura:** `cache/{prefix}/{key}`
- **Limpieza:** Automática de entradas expiradas y manual vía endpoints

### LLM y Function Calling
El sistema usa Groq con modelos como Llama para:
- Generar recomendaciones personalizadas
- Crear itinerarios optimizados
- Responder preguntas en el chat
- Utiliza function calling para ejecutar acciones (buscar lugares, obtener detalles, etc.)

### Servicios Externos
- **Google Places API:** Búsqueda y detalles de lugares
- **Firebase Auth:** Autenticación de usuarios
- **Firebase Realtime Database:** Almacenamiento de datos y caché

### Logging
Sistema de logging configurado en `app/main.py`:
- Nivel configurable vía `settings.LOG_LEVEL`
- Formato: timestamp, nombre, nivel, mensaje

---

## Documentación Interactiva

FastAPI genera documentación interactiva automática:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Estas interfaces permiten:
- Explorar todos los endpoints
- Ver esquemas de datos
- Probar peticiones directamente
- Ver ejemplos de respuestas

---


**Versión de la documentación:** 1.0.0
**Última actualización:** 2024-01-15
