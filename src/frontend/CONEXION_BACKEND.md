# Guía de Conexión Frontend-Backend

## Configuración Completada

### 1. Archivos Creados/Actualizados

- `.env` - Archivo con variables de entorno (NO se sube a git)
- `.env.example` - Ejemplo de configuración para el equipo
- `app.json` - Puerto actualizado de 8080 a 8000
- `.gitignore` - Actualizado para proteger `.env`

### 2. Estructura de la API

El backend está configurado en:
- **URL Base**: `http://localhost:8000/api/v1`
- **Framework**: FastAPI
- **Puerto**: 8000
- **CORS**: Habilitado para todos los orígenes

### 3. Servicios Disponibles

El frontend tiene servicios completos en `src/api/services.ts`:

#### Users Service
- `usersService.getProfile(uid)` - Obtener perfil de usuario
- `usersService.updateProfile(uid, data)` - Actualizar perfil
- `usersService.updateInterests(uid, interests)` - Actualizar intereses
- `usersService.getFavorites(uid)` - Obtener lugares favoritos
- `usersService.addFavorite(uid, placeId, placeData)` - Agregar favorito
- `usersService.removeFavorite(uid, placeId)` - Eliminar favorito

#### Places Service
- `placesService.search(params)` - Buscar lugares por ubicación y texto
  - Parámetros: `{ q?, lat, lng, radius?, place_type? }`
- `placesService.getDetails(placeId)` - Obtener detalles de un lugar
- `placesService.getByCategory(categories, limit)` - Buscar por categorías

#### Recommendations Service
- `recommendationsService.generate(params)` - Generar recomendaciones con IA
  - Parámetros: `{ user_id, location?, limit?, categories? }`

#### Itineraries Service
- `itinerariesService.generate(data)` - Generar itinerario con IA
  - Parámetros: `{ city, days, interests?, budget? }`
- `itinerariesService.getUserItineraries(userId)` - Listar itinerarios del usuario
- `itinerariesService.getById(itineraryId)` - Obtener itinerario específico
- `itinerariesService.create(userId, data)` - Crear itinerario manualmente
- `itinerariesService.update(itineraryId, data)` - Actualizar itinerario
- `itinerariesService.delete(itineraryId)` - Eliminar itinerario

#### Chat Service
- `chatService.sendMessage(data)` - Enviar mensaje al asistente IA
  - Parámetros: `{ user_id, session_id?, message, context? }`
- `chatService.getHistory(sessionId, limit?)` - Obtener historial de conversación
- `chatService.connectWebSocket(userId, sessionId)` - Conectar WebSocket para chat en tiempo real

#### Cache Service (Admin)
- `cacheService.getStats()` - Obtener estadísticas de caché
- `cacheService.clearPrefix(prefix)` - Limpiar caché por prefijo
- `cacheService.cleanExpired(prefix)` - Limpiar entradas expiradas

### 4. Cómo Usar los Servicios

```typescript
import {
  placesService,
  chatService,
  itinerariesService,
  usersService
} from '@/api/services';

// Ejemplo 1: Buscar lugares
const places = await placesService.search({
  q: 'restaurantes',
  lat: 40.4168,
  lng: -3.7038,
  radius: 5000,
  place_type: 'restaurant'
});

// Ejemplo 2: Generar itinerario con IA
const itinerary = await itinerariesService.generate({
  city: 'Madrid',
  days: 3,
  interests: ['cultura', 'gastronomía'],
  budget: 'medium'
});

// Ejemplo 3: Chat con IA
const response = await chatService.sendMessage({
  user_id: currentUser.uid,
  session_id: 'unique-session-id',
  message: '¿Qué lugares me recomiendas en Madrid?'
});

// Ejemplo 4: Favoritos
await usersService.addFavorite(
  currentUser.uid,
  'place-id-123',
  { name: 'Museo del Prado', rating: 4.8 }
);

// Ejemplo 5: WebSocket para chat en tiempo real
const ws = chatService.connectWebSocket(currentUser.uid, sessionId);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Respuesta:', data.response);
};
ws.send(JSON.stringify({ message: 'Hola!' }));
```

## Pasos para Iniciar

### 1. Iniciar el Backend

```bash
cd C:\Users\josej\OneDrive\Documentos\TAi-joseesk\TAi-joseesk\src\backend\TAi_backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Verificar que el Backend está corriendo

Abre en el navegador:
- http://localhost:8000 - Debería mostrar mensaje de bienvenida
- http://localhost:8000/health - Debería mostrar estado del sistema
- http://localhost:8000/docs - Documentación Swagger de la API

### 3. Iniciar el Frontend

```bash
cd C:\Users\josej\OneDrive\Documentos\TAi\src\frontend
npm start
# o
expo start
```

## Configuración de Red Local

Si necesitas conectar desde un dispositivo físico en la misma red:

1. Obtén tu IP local:
   ```bash
   ipconfig  # En Windows
   # Busca "IPv4 Address" en tu adaptador de red activo
   ```

2. Actualiza `.env`:
   ```
   EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000/api/v1
   ```

3. Asegúrate de que el backend esté escuchando en `0.0.0.0:8000`

## Autenticación

El frontend está configurado con interceptores de Axios que:
1. Obtienen automáticamente el token de Firebase Auth
2. Lo adjuntan en el header `Authorization: Bearer <token>`
3. Renuevan el token si expira (401)

No necesitas agregar el token manualmente en cada petición.

## Troubleshooting

### Error: Network Error o timeout
- Verifica que el backend esté corriendo
- Verifica que la URL en `.env` sea correcta
- Si usas red local, verifica que el firewall permita el puerto 8000

### Error: 401 Unauthorized
- Verifica que el usuario esté autenticado con Firebase
- Verifica que el backend tenga la configuración correcta de Firebase

### Error: 404 Not Found
- Verifica que el endpoint existe en el backend
- Revisa la documentación en http://localhost:8000/docs

### Error: CORS
- El backend ya tiene CORS habilitado para todos los orígenes
- Si el problema persiste, verifica los logs del backend

## Endpoints del Backend

Todos los endpoints están bajo `/api/v1`:

- `/users/*` - Gestión de usuarios y preferencias
- `/places/*` - Búsqueda y gestión de lugares
- `/recommendations/*` - Recomendaciones personalizadas
- `/itineraries/*` - Gestión de itinerarios
- `/chat/*` - Asistente de viaje con IA
- `/cache/*` - Gestión de caché (admin)

## Próximos Pasos

1. Configura tus credenciales de Firebase en `.env`
2. Inicia el backend
3. Inicia el frontend
4. Prueba las funcionalidades en la app
