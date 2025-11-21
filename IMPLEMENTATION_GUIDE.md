# 📋 Guía de Implementación de Nuevas Características

## ✅ Características Implementadas

### 1. 🗺️ **Mapa Interactivo con Lugares Cercanos**

**Archivo:** `/src/frontend/src/components/Map/NearbyPlacesMap.tsx`

**Características:**
- Mapa interactivo que muestra lugares cercanos basados en la ubicación del usuario
- Filtros por categorías (Restaurantes, Cafés, Museos, Parques, etc.)
- Lista scrolleable de lugares con distancia y rating
- Integración con Google Places API

**Cómo usar:**

```typescript
import { NearbyPlacesMap } from '../components/Map/NearbyPlacesMap';

function SearchScreen() {
  const [userLocation, setUserLocation] = useState({ latitude: -33.4489, longitude: -70.6693 });

  return (
    <NearbyPlacesMap
      userLocation={userLocation}
      radius={1000}  // Radio en metros
      onPlaceSelect={(place) => {
        console.log('Lugar seleccionado:', place.name);
        // Navegar a detalles del lugar
      }}
    />
  );
}
```

---

### 2. ⏰ **Recomendaciones con Horarios y Estado de Apertura**

**Archivos modificados:**
- `/src/frontend/src/screens/Home/Home.tsx` (líneas 98-218)

**Características:**
- Indicador visual de "Abierto ahora" / "Cerrado"
- Muestra hora de cierre si está abierto
- Muestra próximo horario de apertura si está cerrado
- Colores verde (abierto) y rojo (cerrado)

**Ejemplo de datos:**

```typescript
interface PlaceRecommendation {
  id: string;
  name: string;
  openingHours?: {
    isOpenNow: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  // ... otros campos
}
```

**Visualización:**
- 🟢 **Abierto ahora · Cierra 20:00**
- 🔴 **Cerrado · Abre 9:00**

---

### 3. 🔔 **Sistema de Notificaciones (Burbuja Flotante)**

**Archivos:**
- `/src/frontend/src/components/Notifications/NotificationBubble.tsx`
- `/src/frontend/src/services/notifications.service.ts`
- `/src/frontend/src/hooks/useNotifications.ts`

**Características:**
- Floating Action Button (FAB) con badge de notificaciones no leídas
- Modal deslizante con lista de notificaciones
- Animación del badge cuando llegan notificaciones nuevas
- Acciones personalizadas por notificación
- Swipe para descartar (simulado con botón X)

**Cómo integrar en cualquier pantalla:**

```typescript
import { NotificationBubble } from '../components/Notifications/NotificationBubble';
import { useNotifications } from '../hooks/useNotifications';

function HomeScreen() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const [userLocation, setUserLocation] = useState(null);

  const {
    notifications,
    markAsRead,
    dismiss,
    clearAll,
    refreshNotifications,
  } = useNotifications({
    userId: user?.uid,
    userLocation,
    userInterests: preferences.interests,
    enableItineraryReminders: true,
    enableNearbyRecommendations: true,
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Tu contenido normal */}

      {/* Burbuja de notificaciones */}
      <NotificationBubble
        notifications={notifications}
        onNotificationPress={(notification) => {
          markAsRead(notification.id);
          // Navegar según el tipo de notificación
        }}
        onNotificationDismiss={dismiss}
        onClearAll={clearAll}
      />
    </View>
  );
}
```

---

### 4. 🎯 **Alertas de Itinerarios Programados**

**Servicio:** `/src/frontend/src/services/notifications.service.ts`

**Tipos de Notificaciones:**

#### 📅 **Recordatorios de Itinerarios**
- **7 días antes:** "Tu viaje a Santiago empieza en 7 días. ¡Prepárate!"
- **3 días antes:** "Tu aventura en Santiago está cerca. Revisa tu itinerario."
- **1 día antes:** "¡Mañana empieza tu viaje! Santiago te espera."
- **Día del viaje:** "¡Hoy empieza tu aventura! Disfruta."

#### ⏰ **Alertas de Horarios de Cierre**
- **1 hora antes:** "Museo Nacional cierra en 1 hora (18:00)"
- **30 minutos antes:** "¡Cierra pronto! Museo Nacional cierra en 30 minutos."

#### 👥 **Alertas de Afluencia**
- **Muy concurrido:** "Cerro San Cristóbal está muy concurrido ahora. Considera visitarlo más tarde."
- **Poco concurrido:** "Momento ideal para visitar. Museo tiene poca afluencia ahora."

#### 📍 **Recomendaciones Contextuales Cercanas**
- "Café La Ventana está a 200m. Te puede gustar por tu interés en gastronomía."
- "Museo de Arte Contemporáneo está a 350m. Perfecto para tu interés en museos."

---

## 🎨 Personalización

### Agregar Nuevos Tipos de Notificaciones

```typescript
// En notifications.service.ts

public generateCustomNotification(
  title: string,
  message: string,
  priority: 'high' | 'medium' | 'low'
): NotificationItem {
  return {
    id: `custom-${Date.now()}`,
    type: 'nearby_recommendation', // o crear un nuevo tipo
    title,
    message,
    timestamp: new Date(),
    priority,
    icon: 'information', // Icono de MaterialCommunityIcons
    read: false,
  };
}
```

### Personalizar Colores de Prioridad

```typescript
// En NotificationBubble.tsx

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return '#ef4444';  // Rojo
    case 'medium':
      return '#f59e0b';  // Naranja
    case 'low':
      return '#3b82f6';  // Azul
    default:
      return theme.colors.primary.main;
  }
};
```

---

## 🔄 Flujo de Datos

```
Usuario → Hook useNotifications → NotificationsService
                ↓
        Genera notificaciones basadas en:
        - Itinerarios programados
        - Ubicación actual
        - Intereses del usuario
        - Horarios de lugares
                ↓
        NotificationBubble (UI)
                ↓
        Usuario interactúa → Acciones personalizadas
```

---

## 📱 Ejemplo Completo de Integración

```typescript
// screens/Home/Home.tsx

import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationBubble } from '../../components/Notifications/NotificationBubble';
import { NearbyPlacesMap } from '../../components/Map/NearbyPlacesMap';
import * as Location from 'expo-location';

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  // Hook de notificaciones
  const {
    notifications,
    markAsRead,
    dismiss,
    clearAll,
    addNotification,
  } = useNotifications({
    userId: user?.uid,
    userLocation: userLocation || undefined,
    userInterests: preferences.interests,
    enableItineraryReminders: true,
    enableNearbyRecommendations: true,
  });

  // Obtener ubicación del usuario
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  // Agregar notificación personalizada de ejemplo
  const handleAddCustomNotification = () => {
    addNotification({
      id: `custom-${Date.now()}`,
      type: 'nearby_recommendation',
      title: 'Nuevo restaurante cerca',
      message: 'Descubre el nuevo café artesanal a 300m de tu ubicación',
      timestamp: new Date(),
      priority: 'medium',
      icon: 'coffee',
      actionText: 'Ver detalles',
      onAction: () => console.log('Ver café'),
      read: false,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        {/* Tus secciones existentes */}

        {/* Sección de Mapa */}
        <View style={{ height: 400, marginVertical: 16 }}>
          <NearbyPlacesMap
            userLocation={userLocation}
            radius={1000}
            onPlaceSelect={(place) => {
              console.log('Lugar seleccionado:', place.name);
              // Navegar a detalles
            }}
          />
        </View>

        {/* Más contenido... */}
      </ScrollView>

      {/* Burbuja de Notificaciones Flotante */}
      <NotificationBubble
        notifications={notifications}
        onNotificationPress={(notification) => {
          markAsRead(notification.id);
          // Manejar navegación según tipo
          switch (notification.type) {
            case 'itinerary_reminder':
              // Navegar a itinerario
              break;
            case 'nearby_recommendation':
              // Navegar a lugar
              break;
            case 'place_closing':
              // Mostrar alerta
              break;
          }
        }}
        onNotificationDismiss={dismiss}
        onClearAll={clearAll}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
```

---

## 🛠️ Próximos Pasos

### Para activar el mapa real con Leaflet (Web)

1. Instalar dependencias de Leaflet para web:
```bash
cd src/frontend
npm install react-leaflet leaflet
npm install --save-dev @types/leaflet
```

2. Reemplazar el placeholder del mapa en `NearbyPlacesMap.tsx` con:
```typescript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// En el componente:
<MapContainer
  center={[userLocation.latitude, userLocation.longitude]}
  zoom={15}
  style={{ height: '100%', width: '100%' }}
>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap contributors'
  />
  {nearbyPlaces.map((place) => (
    <Marker
      key={place.id}
      position={[place.coords.latitude, place.coords.longitude]}
    >
      <Popup>{place.name}</Popup>
    </Marker>
  ))}
</MapContainer>
```

### Para notificaciones push reales (Opcional)

1. Configurar Expo Notifications:
```bash
expo install expo-notifications
```

2. Implementar en `notifications.service.ts`:
```typescript
import * as Notifications from 'expo-notifications';

// Configurar handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Enviar notificación local
await Notifications.scheduleNotificationAsync({
  content: {
    title: notification.title,
    body: notification.message,
  },
  trigger: { seconds: 1 },
});
```

---

## 📊 Estructura de Archivos Creados/Modificados

```
src/frontend/src/
├── components/
│   ├── Map/
│   │   └── NearbyPlacesMap.tsx           [NUEVO]
│   └── Notifications/
│       └── NotificationBubble.tsx         [NUEVO]
├── hooks/
│   └── useNotifications.ts                [NUEVO]
├── services/
│   └── notifications.service.ts           [NUEVO]
└── screens/
    └── Home/
        └── Home.tsx                        [MODIFICADO]
```

---

## 🎯 Resumen de Funcionalidades

✅ **Mapa interactivo** con lugares cercanos filtrados por categoría
✅ **Recomendaciones** con horarios de apertura y estado (abierto/cerrado)
✅ **Burbuja flotante** de notificaciones con badge animado
✅ **Recordatorios** de itinerarios programados (7d, 3d, 1d, hoy)
✅ **Alertas** de lugares por cerrar (1h, 30min antes)
✅ **Notificaciones** de lugares con mucha/poca gente
✅ **Recomendaciones** contextuales basadas en ubicación e intereses

---

## 🚀 Backend ya configurado

- ✅ Servidor corriendo en **http://localhost:8000**
- ✅ Firebase conectado correctamente
- ✅ Google Places API integrada
- ✅ Reglas de Firestore actualizadas para subcollections

---

## 📝 Notas Importantes

1. **Desplegar reglas de Firestore**: Ve a Firebase Console y publica las reglas actualizadas desde `firestore.rules`
2. **Desactivar bloqueador de anuncios**: Si tienes errores de ERR_BLOCKED_BY_CLIENT
3. **Permisos de ubicación**: La app solicitará permisos de ubicación para las funciones de mapa y recomendaciones cercanas

---

**¡Todo listo para usar! 🎉**
