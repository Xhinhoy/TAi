# Guía de Integración Frontend-Backend TAi

## Estado Actual

✅ Backend corriendo en `http://localhost:8080`
✅ Frontend corriendo (puerto Expo)
✅ Servicios de API creados y configurados
✅ CORS configurado correctamente

## Estructura de la Integración

### 1. Servicios de API Creados

El frontend ahora tiene servicios completos para todos los endpoints del backend:

**Archivo:** `src/frontend/src/api/services.ts`

- **usersService**: Gestión de usuarios y preferencias
- **placesService**: Búsqueda y detalles de lugares
- **recommendationsService**: Recomendaciones personalizadas con IA
- **itinerariesService**: Creación y gestión de itinerarios
- **chatService**: Asistente de viajes con IA
- **cacheService**: Gestión de caché (admin)

### 2. Servicios Actualizados

#### `src/frontend/src/api/places.api.ts`
Ahora usa el backend API en lugar de Firestore directamente:
- `searchPlaces()` → API `/places/search`
- `getNearbyPlaces()` → API `/places/nearby`
- `getPlaceDetails()` → API `/places/{id}`

#### `src/frontend/src/services/recommendations.service.ts`
Ahora usa las recomendaciones del backend con IA:
- `generateRecommendations()` → API `/recommendations/personalized`
- `createItinerary()` → API `/itineraries/generate`
- Incluye fallbacks a datos locales si el backend falla

### 3. Configuración

**Variables de Entorno** (`.env`):
```env
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
EXPO_PUBLIC_MAP_PROVIDER=leaflet
EXPO_PUBLIC_ENV=development
```

**Cliente API** (`src/frontend/src/api/client.ts`):
- Base URL configurada
- Interceptores de autenticación Firebase
- Manejo automático de tokens JWT
- Retry logic para tokens expirados

## Cómo Usar los Servicios

### Ejemplo 1: Buscar Lugares

```typescript
import { placesService } from '../api/services';

// Buscar lugares
const places = await placesService.search({
  query: 'museo',
  category: 'museum',
  min_rating: 4.0,
  limit: 10
});

// Lugares cercanos
const nearby = await placesService.nearby({
  latitude: -33.4489,
  longitude: -70.6693,
  radius: 5000,
  limit: 20
});
```

### Ejemplo 2: Recomendaciones Personalizadas

```typescript
import { recommendationsService } from '../api/services';

const recommendations = await recommendationsService.getPersonalized({
  user_id: 'user123',
  location: {
    latitude: -33.4489,
    longitude: -70.6693
  },
  categories: ['museos', 'parques', 'restaurantes'],
  limit: 10
});
```

### Ejemplo 3: Generar Itinerario con IA

```typescript
import { itinerariesService } from '../api/services';

const itinerary = await itinerariesService.generate({
  user_id: 'user123',
  destination: 'Santiago, Chile',
  start_date: '2024-03-01',
  end_date: '2024-03-03',
  preferences: {
    budget: 'medium',
    pace: 'moderate',
    interests: ['museos', 'gastronomia', 'arquitectura']
  }
});
```

### Ejemplo 4: Chat con Asistente IA

```typescript
import { chatService } from '../api/services';

const response = await chatService.sendMessage({
  user_id: 'user123',
  message: '¿Qué lugares me recomiendas visitar en Santiago?',
  context: {
    current_location: {
      latitude: -33.4489,
      longitude: -70.6693
    }
  }
});

console.log(response.message);
console.log(response.suggestions);
console.log(response.places);
```

### Ejemplo 5: Gestión de Preferencias de Usuario

```typescript
import { usersService } from '../api/services';

// Obtener preferencias
const preferences = await usersService.getPreferences('user123');

// Actualizar preferencias
await usersService.updatePreferences('user123', {
  budget: 'high',
  interests: ['museos', 'arquitectura', 'vida-nocturna'],
  preferredLanguage: 'es',
  accessibility: ['wheelchair', 'elevator']
});
```

## Actualización de Componentes Existentes

### Home Screen

Actualizar para usar recomendaciones del backend:

```typescript
import { localRecommendationsService } from '../services/recommendations.service';
import { useAuth } from '../hooks/useAuth';

function Home() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();

  useEffect(() => {
    if (user && preferences) {
      loadRecommendations();
    }
  }, [user, preferences]);

  const loadRecommendations = async () => {
    const recommendations = await localRecommendationsService.generateRecommendations(
      preferences,
      user.uid,
      currentLocation,
      10
    );
    setRecommendations(recommendations);
  };
}
```

### Search Screen

Actualizar para usar búsqueda del backend:

```typescript
import { searchPlaces, getNearbyPlaces } from '../api/places.api';

function Search() {
  const handleSearch = async (query: string) => {
    const results = await searchPlaces(query);
    setResults(results);
  };

  const loadNearbyPlaces = async () => {
    const location = await getCurrentLocation();
    const places = await getNearbyPlaces(
      location.latitude,
      location.longitude,
      5000
    );
    setNearbyPlaces(places);
  };
}
```

### Itinerary Builder

Actualizar para usar generación de itinerarios con IA:

```typescript
import { localRecommendationsService } from '../services/recommendations.service';

function ItineraryBuilder() {
  const handleGenerateItinerary = async () => {
    const itinerary = await localRecommendationsService.createItinerary(
      user.uid,
      preferences,
      'Santiago, Chile',
      startDate,
      endDate,
      24, // duration in hours
      currentLocation
    );
    setItinerary(itinerary);
  };
}
```

## Autenticación

El cliente API está configurado para usar Firebase Auth automáticamente:

1. El usuario inicia sesión con Firebase
2. Los interceptores del cliente API obtienen el token JWT
3. El token se agrega automáticamente a todas las peticiones
4. Si el token expira, se renueva automáticamente

No necesitas agregar headers de autenticación manualmente.

## Manejo de Errores

Todos los servicios incluyen manejo de errores:

```typescript
try {
  const places = await placesService.search({ query: 'museo' });
} catch (error) {
  console.error('Error buscando lugares:', error);
  // Mostrar mensaje al usuario
}
```

Los servicios de recomendaciones incluyen fallbacks automáticos a datos locales si el backend falla.

## Testing

### Probar la Conexión

1. Asegúrate de que el backend esté corriendo:
   ```bash
   cd src/backend
   python -m app.main
   ```

2. Verifica el health check:
   ```bash
   curl http://localhost:8080/health
   ```

3. Desde el frontend, prueba una petición simple:
   ```typescript
   import { api } from './api/client';

   const response = await api.get('/health');
   console.log(response.data);
   ```

### Debugging

Si tienes problemas de conexión:

1. **Verifica CORS**: El backend debe permitir el origen del frontend
2. **Verifica la URL**: Asegúrate de que `EXPO_PUBLIC_API_URL` sea correcta
3. **Verifica autenticación**: Revisa que el usuario esté autenticado en Firebase
4. **Revisa logs**: El backend muestra logs detallados en la consola

## Endpoints Disponibles

### Usuarios
- `POST /api/v1/users` - Crear usuario
- `GET /api/v1/users/{uid}` - Obtener perfil
- `PUT /api/v1/users/{uid}` - Actualizar perfil
- `GET /api/v1/users/{uid}/preferences` - Obtener preferencias
- `PUT /api/v1/users/{uid}/preferences` - Actualizar preferencias

### Lugares
- `GET /api/v1/places/search` - Buscar lugares
- `GET /api/v1/places/nearby` - Lugares cercanos
- `GET /api/v1/places/{id}` - Detalles de lugar
- `POST /api/v1/places/{id}/sync` - Sincronizar con Google Places

### Recomendaciones
- `POST /api/v1/recommendations/personalized` - Recomendaciones personalizadas con IA
- `GET /api/v1/recommendations/category` - Por categoría
- `GET /api/v1/recommendations/trending` - Lugares trending

### Itinerarios
- `POST /api/v1/itineraries` - Crear itinerario
- `POST /api/v1/itineraries/generate` - Generar con IA
- `GET /api/v1/itineraries/{id}` - Obtener itinerario
- `PUT /api/v1/itineraries/{id}` - Actualizar
- `GET /api/v1/itineraries/user` - Itinerarios del usuario

### Chat
- `POST /api/v1/chat` - Enviar mensaje al asistente IA
- `GET /api/v1/chat/{conversation_id}` - Obtener conversación
- `GET /api/v1/chat/conversations` - Lista de conversaciones

## Próximos Pasos

1. ✅ Servicios de API creados
2. ✅ Configuración de cliente API
3. ✅ Variables de entorno configuradas
4. ⏳ Actualizar componentes para usar los nuevos servicios
5. ⏳ Agregar manejo de loading states
6. ⏳ Agregar manejo de errores en UI
7. ⏳ Testing de integración completa
8. ⏳ Optimización de performance (caché, debounce, etc.)

## Notas Importantes

- El backend está en **MOCK_MODE** por defecto, lo que significa que puede funcionar sin credenciales completas
- Las recomendaciones con IA requieren configurar `GROQ_API_KEY` en el backend
- Los datos de Google Places requieren `GOOGLE_PLACES_API_KEY`
- El servicio de recomendaciones tiene fallbacks a datos locales si el backend falla
- Todos los servicios manejan autenticación automáticamente vía Firebase

## Soporte

Para más detalles sobre los endpoints del backend, consulta:
- `src/backend/API_DOCUMENTATION.md`
- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`
