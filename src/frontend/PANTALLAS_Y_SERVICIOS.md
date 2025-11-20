# 📱 Guía de Pantallas y Servicios de la App TAi

## Resumen de Pantallas

Tu app tiene 5 pantallas principales:

### 1. 🏠 **Home** (`src/screens/Home/Home.tsx`)
### 2. 🔍 **Search** (`src/screens/Search/Search.tsx`)
### 3. 💬 **Chat** (`src/screens/Chat/Chat.tsx`)
### 4. 🗺️ **Itinerary Builder** (`src/screens/Itinerary/Builder.tsx`)
### 5. 👤 **Profile** (`src/screens/Profile/Profile.tsx`)

---

## 1. 🏠 Pantalla Home

### ¿Qué hace actualmente?

- **Muestra saludo personalizado** al usuario
- **Muestra intereses turísticos** del usuario (música, arte, deportes, etc.)
- **Genera recomendaciones personalizadas** basadas en intereses (usando servicio LOCAL)
- **Muestra itinerarios guardados** (desde Firebase Firestore local)
- **Muestra lugares favoritos** (desde Firebase Firestore local)
- **Botón de cargar datos demo** para pruebas

### 🔧 Estado actual:
- ✅ Usa Firebase Firestore DIRECTAMENTE
- ✅ Usa servicio de recomendaciones LOCAL (`localRecommendationsService`)
- ❌ NO usa el backend

### 🎯 Servicios del backend que debería usar:

```typescript
// 1. Obtener recomendaciones personalizadas
import { recommendationsService } from '@/api/services';

const recommendations = await recommendationsService.generate({
  user_id: user.uid,
  location: { latitude: -33.4489, longitude: -70.6693 },
  limit: 10,
  categories: preferences.interests
});

// 2. Obtener itinerarios del usuario
import { itinerariesService } from '@/api/services';

const itineraries = await itinerariesService.getUserItineraries(user.uid);

// 3. Obtener favoritos
import { usersService } from '@/api/services';

const favorites = await usersService.getFavorites(user.uid);
```

### 📝 Integración recomendada:

**Reemplazar:**
- Líneas 237-248: `localRecommendationsService` → `recommendationsService.generate()`
- Líneas 262-273: Query de Firestore itinerarios → `itinerariesService.getUserItineraries()`
- Líneas 275-286: Query de Firestore favoritos → `usersService.getFavorites()`

---

## 2. 🔍 Pantalla Search

### ¿Qué hace actualmente?

- **Barra de búsqueda** para encontrar lugares
- **Filtros por categoría** (restaurantes, museos, parques, etc.)
- **Filtros por rating mínimo**
- **Filtros por distancia** (radio en km)
- **Mapa interactivo** con marcadores de lugares
- **Lista de resultados** ordenada por distancia o rating
- **Solo funciona en web** (requiere mapa)

### 🔧 Estado actual:
- ✅ Usa datos LOCALES de `places.json`
- ✅ Calcula distancias en el cliente
- ❌ NO usa el backend

### 🎯 Servicios del backend que debería usar:

```typescript
import { placesService } from '@/api/services';

// Buscar lugares cerca del usuario
const places = await placesService.search({
  q: 'restaurantes',           // texto de búsqueda
  lat: userLocation.lat,        // latitud actual
  lng: userLocation.lng,        // longitud actual
  radius: 5000,                 // radio en metros
  place_type: 'restaurant'      // tipo de lugar
});

// Buscar por categorías
const placesByCategory = await placesService.getByCategory(
  ['food', 'culture'],
  20  // límite
);

// Obtener detalles de un lugar
const placeDetails = await placesService.getDetails(placeId);
```

### 📝 Integración recomendada:

**Reemplazar:**
- Líneas 52-91: Función `performSearch()` completa
- Usar `placesService.search()` en lugar de filtrar `places.json`
- El backend ya calcula distancias, no necesitas la función `calculateDistance`

---

## 3. 💬 Pantalla Chat

### ¿Qué hace actualmente?

- **Chat con asistente IA** para hacer preguntas sobre viajes
- **Acciones rápidas** predefinidas (recomendaciones, itinerarios, comida)
- **Muestra sugerencias de lugares** en respuestas del bot
- **Historial de mensajes** en la conversación
- **Manejo de errores** si falla el backend

### 🔧 Estado actual:
- ✅ YA USA el backend correctamente
- ✅ Llama a `chatService.sendMessage()`
- ✅ Maneja respuestas con lugares y sugerencias

### ✅ Integración completa:

```typescript
// Enviar mensaje (ya implementado)
const response = await chatService.sendMessage({
  user_id: user.uid,
  session_id: conversationId ?? "default",
  message: inputText,
  context: {}
});

// ✨ NUEVO: Obtener historial de conversación
const history = await chatService.getHistory(conversationId, 50);

// ✨ NUEVO: Conectar WebSocket para chat en tiempo real
const ws = chatService.connectWebSocket(user.uid, sessionId);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Manejar mensaje en tiempo real
};
```

### 📝 Mejoras opcionales:

- **Agregar botón "Cargar historial"** al inicio del chat (línea 35)
- **Implementar WebSocket** para respuestas en tiempo real (más fluido)
- **Mostrar indicador de "escribiendo..."** cuando el backend está procesando

---

## 4. 🗺️ Pantalla Itinerary Builder

### ¿Qué hace actualmente?

- **Formulario simple** para crear itinerarios manualmente
- **Campos:** Título, Ciudad, Días, Lista de lugares/notas
- **Guarda en Firebase Firestore** directamente
- **NO usa IA** para generar itinerarios

### 🔧 Estado actual:
- ✅ Guarda en Firestore directamente
- ❌ NO usa el backend
- ❌ NO aprovecha la generación con IA

### 🎯 Servicios del backend que debería usar:

```typescript
import { itinerariesService } from '@/api/services';

// 🌟 NUEVO: Generar itinerario con IA
const aiItinerary = await itinerariesService.generate({
  city: 'Madrid',
  days: 3,
  interests: ['cultura', 'gastronomía'],
  budget: 'medium'
});

// Crear itinerario manualmente
const manualItinerary = await itinerariesService.create(user.uid, {
  title: 'Mi viaje a Santiago',
  description: 'Fin de semana largo',
  days: 3,
  preferences: {
    budget: 'medium',
    interests: ['food', 'nature']
  }
});

// Obtener itinerarios del usuario
const myItineraries = await itinerariesService.getUserItineraries(user.uid);

// Actualizar itinerario
await itinerariesService.update(itineraryId, {
  title: 'Nuevo título',
  days: 4
});

// Eliminar itinerario
await itinerariesService.delete(itineraryId);
```

### 📝 Integración recomendada:

**Opción 1: Mejorar pantalla actual**
- Agregar botón "🪄 Generar con IA"
- Mostrar formulario simple O generación con IA
- Usar `itinerariesService.generate()` para IA
- Usar `itinerariesService.create()` para manual

**Opción 2: Crear nueva pantalla**
- `Builder.tsx` → Crear manual
- `Generator.tsx` → Generar con IA

---

## 5. 👤 Pantalla Profile

### ¿Qué hace actualmente?

- **Muestra información del usuario** (nombre, email, foto)
- **Información básica** (ubicación, idioma, zona horaria)
- **Selección de intereses turísticos** con modal interactivo
- **Configuración de cuenta** (seguridad, idioma, ayuda)
- **Cerrar sesión**

### 🔧 Estado actual:
- ✅ Usa Firebase Auth para autenticación
- ✅ Usa Firestore para guardar perfil
- ❌ NO usa el backend para perfil
- ✅ Sistema de intereses funciona bien con contexto local

### 🎯 Servicios del backend que debería usar:

```typescript
import { usersService } from '@/api/services';

// Obtener perfil del usuario
const profile = await usersService.getProfile(user.uid);

// Actualizar perfil
await usersService.updateProfile(user.uid, {
  displayName: 'Nuevo Nombre',
  bio: 'Mi biografía',
  photoURL: 'https://...'
});

// Actualizar intereses
await usersService.updateInterests(user.uid, [
  'food',
  'culture',
  'nature'
]);

// Gestionar favoritos
const favorites = await usersService.getFavorites(user.uid);
await usersService.addFavorite(user.uid, placeId, placeData);
await usersService.removeFavorite(user.uid, placeId);
```

### 📝 Integración recomendada:

**Mantener:**
- Firebase Auth para autenticación (es correcto)
- Contexto local de preferencias (`usePreferences`) para sincronización

**Agregar:**
- Sincronizar con backend al guardar intereses (línea 301)
- Cargar perfil desde backend al iniciar (línea 220)
- Botón "Sincronizar con servidor" opcional

---

## 🚀 Plan de Integración Recomendado

### Fase 1: Chat (Ya está listo ✅)
- Ya usa el backend correctamente
- Opcional: Agregar historial y WebSocket

### Fase 2: Search (Alta prioridad 🔥)
```typescript
// En Search.tsx línea 52
const performSearch = async () => {
  try {
    const results = await placesService.search({
      q: query,
      lat: userLocation.lat,
      lng: userLocation.lng,
      radius: prefs.radiusKm * 1000, // convertir a metros
      place_type: prefs.categories[0] // o maneja múltiples
    });
    setResults(results);
  } catch (error) {
    console.error('Error searching:', error);
  }
};
```

### Fase 3: Home (Media prioridad 📊)
```typescript
// En Home.tsx línea 227
useEffect(() => {
  const loadData = async () => {
    if (!user) return;

    try {
      // Recomendaciones
      const recs = await recommendationsService.generate({
        user_id: user.uid,
        location: { latitude: -33.4489, longitude: -70.6693 },
        categories: preferences.interests,
        limit: 10
      });
      setRecommendations(recs);

      // Itinerarios
      const its = await itinerariesService.getUserItineraries(user.uid);
      setItineraries(its);

      // Favoritos
      const favs = await usersService.getFavorites(user.uid);
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  loadData();
}, [user, preferences.interests]);
```

### Fase 4: Itinerary Builder (Mejora importante 🌟)
```typescript
// Agregar botón en Builder.tsx
const generateWithAI = async () => {
  try {
    const itinerary = await itinerariesService.generate({
      city: city,
      days: Number(days),
      interests: userPreferences.interests,
      budget: 'medium'
    });

    // Llenar formulario con datos generados
    setTitle(itinerary.title);
    setItems(itinerary.items.map(item => item.notes));

    Alert.alert('Éxito', 'Itinerario generado con IA');
  } catch (error) {
    Alert.alert('Error', 'No se pudo generar itinerario');
  }
};
```

### Fase 5: Profile (Opcional 🔄)
- Mantener funcionamiento actual
- Agregar sincronización opcional con backend

---

## 📊 Resumen de Prioridades

| Pantalla | Estado Actual | Prioridad | Dificultad | Impacto |
|----------|---------------|-----------|------------|---------|
| Chat | ✅ Integrado | - | - | ✅ Listo |
| Search | ❌ Datos locales | 🔥 Alta | Media | Alto |
| Home | ❌ Firestore | 📊 Media | Media | Alto |
| Builder | ❌ Manual básico | 🌟 Media | Baja | Muy alto |
| Profile | ⚠️ Parcial | 🔄 Baja | Baja | Medio |

---

## 🛠️ Próximos Pasos

1. **Iniciar backend** y verificar que funciona
2. **Integrar Search** (reemplazar `places.json` con `placesService`)
3. **Integrar Home** (recomendaciones e itinerarios)
4. **Mejorar Builder** (agregar generación con IA)
5. **Opcional:** Sincronizar Profile con backend

¿Por cuál pantalla quieres empezar la integración?
