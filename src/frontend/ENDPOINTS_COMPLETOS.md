# 📋 Endpoints Completos del Backend

Todos los endpoints del backend están ahora disponibles en el frontend.

## ✅ Endpoints Implementados

### 👤 Users (`/users`)

| Método | Endpoint | Servicio Frontend | Descripción |
|--------|----------|-------------------|-------------|
| GET | `/users/{uid}/profile` | `usersService.getProfile(uid)` | Obtener perfil |
| PUT | `/users/{uid}/profile` | `usersService.updateProfile(uid, data)` | Actualizar perfil |
| PATCH | `/users/{uid}/interests` | `usersService.updateInterests(uid, interests)` | Actualizar intereses |
| GET | `/users/{uid}/favorites` | `usersService.getFavorites(uid)` | Obtener favoritos |
| POST | `/users/{uid}/favorites` | `usersService.addFavorite(uid, placeId, data)` | Agregar favorito |
| DELETE | `/users/{uid}/favorites/{place_id}` | `usersService.removeFavorite(uid, placeId)` | Eliminar favorito |

### 📍 Places (`/places`)

| Método | Endpoint | Servicio Frontend | Descripción |
|--------|----------|-------------------|-------------|
| GET | `/places/search` | `placesService.search(params)` | Buscar lugares |
| GET | `/places/{place_id}` | `placesService.getDetails(placeId)` | Detalles de lugar |
| GET | `/places/by-category/` | `placesService.getByCategory(categories, limit)` | Por categorías |

**Parámetros de búsqueda:**
```typescript
{
  q?: string,        // Texto de búsqueda
  lat: number,       // Latitud (requerido)
  lng: number,       // Longitud (requerido)
  radius?: number,   // Radio en metros (default: 5000)
  place_type?: string // Tipo de lugar
}
```

### 🎯 Recommendations (`/recommendations`)

| Método | Endpoint | Servicio Frontend | Descripción |
|--------|----------|-------------------|-------------|
| POST | `/recommendations/generate` | `recommendationsService.generate(params)` | Generar recomendaciones IA |

**Parámetros:**
```typescript
{
  user_id: string,
  location?: { latitude: number, longitude: number },
  limit?: number,
  categories?: string[]
}
```

### 🗺️ Itineraries (`/itineraries`)

| Método | Endpoint | Servicio Frontend | Descripción |
|--------|----------|-------------------|-------------|
| POST | `/itineraries/generate` | `itinerariesService.generate(data)` | Generar con IA |
| GET | `/itineraries/user/{user_id}` | `itinerariesService.getUserItineraries(userId)` | Listar del usuario |
| GET | `/itineraries/{itinerary_id}` | `itinerariesService.getById(id)` | Obtener específico |
| POST | `/itineraries/{user_id}` | `itinerariesService.create(userId, data)` | Crear manual |
| PUT | `/itineraries/{itinerary_id}` | `itinerariesService.update(id, data)` | Actualizar |
| DELETE | `/itineraries/{itinerary_id}` | `itinerariesService.delete(id)` | Eliminar |

**Generar itinerario:**
```typescript
{
  city: string,      // Ciudad destino
  days: number,      // Número de días
  interests?: string[], // Intereses del usuario
  budget?: string    // Presupuesto
}
```

### 💬 Chat (`/chat`)

| Método | Endpoint | Servicio Frontend | Descripción |
|--------|----------|-------------------|-------------|
| POST | `/chat/message` | `chatService.sendMessage(data)` | Enviar mensaje |
| GET | `/chat/history/{session_id}` | `chatService.getHistory(sessionId, limit)` | Obtener historial |
| WS | `/chat/ws/{user_id}/{session_id}` | `chatService.connectWebSocket(userId, sessionId)` | Chat tiempo real |

**Request:**
```typescript
{
  user_id: string,
  session_id?: string,
  message: string,
  context?: Record<string, any>
}
```

**Response:**
```typescript
{
  response: string,
  session_id: string,
  actions?: any[],
  places?: Place[]
}
```

### 🗑️ Cache (`/cache`) - Admin

| Método | Endpoint | Servicio Frontend | Descripción |
|--------|----------|-------------------|-------------|
| GET | `/cache/stats` | `cacheService.getStats()` | Estadísticas |
| DELETE | `/cache/clear/{prefix}` | `cacheService.clearPrefix(prefix)` | Limpiar por prefijo |
| DELETE | `/cache/clean-expired/{prefix}` | `cacheService.cleanExpired(prefix)` | Limpiar expirados |

## 🔐 Autenticación

Todos los endpoints requieren autenticación con Firebase Auth. El cliente axios (`src/api/client.ts`) maneja automáticamente:

1. ✅ Obtención del token de Firebase
2. ✅ Adjuntar token en header `Authorization: Bearer <token>`
3. ✅ Renovación automática si el token expira (401)

No necesitas agregar el token manualmente en cada petición.

## 🚀 Uso Rápido

```typescript
import {
  usersService,
  placesService,
  chatService,
  itinerariesService
} from '@/api/services';

// 1. Buscar lugares
const places = await placesService.search({
  q: 'museos',
  lat: 40.4168,
  lng: -3.7038,
  radius: 2000
});

// 2. Generar itinerario
const itinerary = await itinerariesService.generate({
  city: 'Barcelona',
  days: 4,
  interests: ['arte', 'arquitectura'],
  budget: 'medium'
});

// 3. Chat con IA
const response = await chatService.sendMessage({
  user_id: user.uid,
  message: 'Recomiéndame restaurantes en Madrid'
});

// 4. Gestionar favoritos
await usersService.addFavorite(user.uid, place.id, place);
const favorites = await usersService.getFavorites(user.uid);
```

## 📝 Notas Importantes

1. **Coordenadas obligatorias**: El endpoint de búsqueda de places requiere `lat` y `lng`
2. **WebSocket**: Para chat en tiempo real, usa `chatService.connectWebSocket()`
3. **Sesiones de chat**: Usa `session_id` para mantener contexto en conversaciones
4. **Rutas corregidas**: Todos los endpoints coinciden exactamente con el backend

## ⚠️ Cambios vs Versión Anterior

- ✅ `usersService`: Ahora usa `/users/{uid}/profile` en vez de `/users/{uid}`
- ✅ `placesService.search`: Ahora requiere `lat`/`lng` en vez de ser opcionales
- ✅ `itinerariesService.generate`: Usa `city` y `days` en vez de `destination` y fechas
- ✅ `chatService`: Response ahora es `response` en vez de `message`
- ✅ Agregados: favoritos, historial de chat, WebSocket, categorías de places
