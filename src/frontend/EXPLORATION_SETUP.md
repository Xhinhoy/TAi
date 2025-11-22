# 🗺️ Setup del Modo de Exploración

Este documento describe cómo configurar el modo de exploración en la aplicación TAi.

## ✅ Instalación Completada

Ya se han instalado las siguientes dependencias:

```bash
✅ expo-location
✅ socket.io-client
✅ react-native-reanimated
✅ react-native-maps (ya estaba instalado)
```

## 📱 Configuración de app.json

Agrega la siguiente configuración a tu archivo `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Necesitamos tu ubicación para mostrarte lugares cercanos mientras exploras."
        }
      ]
    ],
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "TU_GOOGLE_MAPS_API_KEY_AQUI"
        }
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "TU_GOOGLE_MAPS_API_KEY_AQUI"
      },
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Necesitamos tu ubicación para mostrarte lugares cercanos mientras exploras.",
        "NSLocationAlwaysUsageDescription": "Necesitamos tu ubicación para enviarte alertas de lugares increíbles mientras caminas."
      }
    }
  }
}
```

### Obtener Google Maps API Key

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
4. Crea credenciales (API Key)
5. Restringe la API key a tu app (opcional pero recomendado)
6. Copia la API key y pégala en `app.json`

## 🔧 Variables de Entorno

Asegúrate de tener configurada la URL del backend en tu archivo `.env`:

```env
EXPO_PUBLIC_API_URL=http://TU_IP:8000/api/v1
```

**Importante para Android:**
- NO uses `localhost`, usa la IP de tu computadora en la red local
- Ejemplo: `http://192.168.1.100:8000/api/v1`
- Para obtener tu IP: `ipconfig` (Windows) o `ifconfig` (Mac/Linux)

## 🚀 Uso del Sistema

### Modo Búsqueda (Web)
- Búsqueda tradicional con IA
- Solo disponible en web
- Muestra recomendaciones en mapa

### Modo Exploración (Mobile + Web)
1. **Iniciar**: Presiona "🗺️ Modo Exploración"
2. **Permisos**: Acepta permisos de ubicación
3. **Configurar**: Elige duración y número de alertas
4. **Explorar**: Camina y recibe alertas de lugares cercanos
5. **Interactuar**: Toca, guarda o descarta lugares
6. **Finalizar**: Ve el resumen de tu sesión

## 📋 Estructura de Archivos Creados

```
src/
├── types/
│   └── exploration.ts                 # Tipos TypeScript
├── api/
│   └── explorationService.ts          # Cliente API REST
├── services/
│   ├── explorationWebSocket.ts        # WebSocket en tiempo real
│   └── locationService.ts             # Tracking de ubicación
├── hooks/
│   ├── useExplorationSession.ts       # Hook de sesión
│   └── useLocationTracking.ts         # Hook de ubicación
└── screens/Search/
    ├── Search.tsx                     # Pantalla principal (modificada)
    ├── SearchExploration.tsx          # Pantalla de exploración
    └── components/
        ├── SessionStatusBar.tsx       # Barra de estado
        ├── ExplorationControls.tsx    # Controles flotantes
        ├── PlaceAlertCard.tsx         # Tarjeta de alerta
        ├── AlertsCarousel.tsx         # Carrusel de alertas
        ├── SessionSummaryModal.tsx    # Modal de resumen
        └── ExplorationMap.tsx         # Mapa con marcadores
```

## 🧪 Testing

### Probar en Desarrollo

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

### Verificar Funcionalidades

- [ ] Permisos de ubicación se solicitan correctamente
- [ ] WebSocket se conecta al backend
- [ ] Se reciben alertas en tiempo real
- [ ] El mapa muestra marcadores correctamente
- [ ] Se puede pausar/reanudar la sesión
- [ ] El resumen se muestra al finalizar
- [ ] Se puede volver al modo de búsqueda

## 🐛 Troubleshooting

### WebSocket no conecta
- Verifica que la URL del backend esté correcta
- Asegúrate de que el backend esté corriendo
- Revisa que uses `ws://` o `wss://` (no `http://`)

### GPS impreciso
- Habilita "Ubicación de alta precisión" en tu dispositivo
- Prueba en exterior (mejor señal GPS)
- Aumenta el `distanceFilter` en el hook

### Alertas no llegan
- Verifica que la sesión esté activa (no pausada)
- Revisa los logs del backend
- Confirma que hay lugares cercanos en tu ubicación

### App se cierra en background
- En producción, implementa background location
- Usa notificaciones locales para alertas
- Considera reducir frecuencia de updates

## 🎯 Próximos Pasos (Opcional)

1. **Notificaciones Push**: Alertas cuando la app está en background
2. **Modo Offline**: Caché de lugares visitados
3. **Filtros Avanzados**: Personalizar tipos de lugares
4. **Historial**: Ver sesiones pasadas con mapa de ruta
5. **Compartir**: Compartir descubrimientos en redes sociales
6. **Gamificación**: Badges y logros por explorar

## 📚 Recursos

- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [React Native Maps Docs](https://github.com/react-native-maps/react-native-maps)
- [Google Maps Platform](https://developers.google.com/maps)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**¿Problemas?** Revisa los logs del backend y del cliente para más información.
