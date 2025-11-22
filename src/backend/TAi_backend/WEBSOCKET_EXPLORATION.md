# 🌐 WebSocket para Modo Exploración - Documentación

## Descripción General

El modo exploración ahora soporta **comunicación en tiempo real vía WebSocket**, permitiendo recibir alertas de lugares cercanos instantáneamente sin necesidad de hacer polling.

---

## 🔌 Endpoint WebSocket

```
ws://tu-servidor.com/api/v1/exploration/ws/{user_id}/{session_id}
```

### Parámetros de URL:
- `user_id`: ID del usuario autenticado
- `session_id`: ID de la sesión de exploración activa

---

## 📨 Protocolo de Mensajes

### Mensajes que el CLIENTE envía al servidor:

#### 1. Actualización de Ubicación
```json
{
  "type": "location_update",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 10.5
}
```

**Respuesta:** Servidor envía `new_alerts` si hay lugares cercanos o `session_update` si no hay alertas.

#### 2. Ping (Keep-Alive)
```json
{
  "type": "ping"
}
```

**Respuesta:**
```json
{
  "type": "pong",
  "timestamp": "2025-01-15T10:30:00"
}
```

#### 3. Solicitar Estado de Sesión
```json
{
  "type": "get_status"
}
```

**Respuesta:**
```json
{
  "type": "session_status",
  "session_info": {
    "session_id": "...",
    "is_paused": false,
    "time_remaining_minutes": 45,
    "alerts_remaining": 15,
    "places_discovered": 8,
    "distance_walked_km": 1.2,
    "alerts_generated": 5
  },
  "timestamp": "2025-01-15T10:30:00"
}
```

---

### Mensajes que el SERVIDOR envía al cliente:

#### 1. Conexión Establecida
```json
{
  "type": "connection_established",
  "message": "Conectado al modo exploración",
  "session_id": "session_abc123",
  "timestamp": "2025-01-15T10:00:00"
}
```

#### 2. Nuevas Alertas (PUSH)
```json
{
  "type": "new_alerts",
  "alerts": [
    {
      "id": "alert_001",
      "place": {
        "id": "place_xyz",
        "name": "Café Artesanal",
        "coords": {
          "latitude": 40.7128,
          "longitude": -74.0061
        },
        "rating": 4.7,
        "address": "123 Main St",
        "price_level": 2,
        "photos": ["https://..."],
        "categories": ["cafe", "restaurant"]
      },
      "distance_meters": 150,
      "priority": "high",
      "message": "¡Café Artesanal coincide con tus intereses! A solo 150m.",
      "match_score": 0.87,
      "estimated_time_minutes": 2
    }
  ],
  "count": 1,
  "session_info": {
    "time_remaining_minutes": 45,
    "alerts_remaining": 14,
    "places_discovered": 9,
    "distance_walked_km": 1.3
  },
  "timestamp": "2025-01-15T10:30:00"
}
```

#### 3. Actualización de Sesión
```json
{
  "type": "session_update",
  "session_info": {
    "time_remaining_minutes": 44,
    "alerts_remaining": 14,
    "places_discovered": 9,
    "distance_walked_km": 1.35
  },
  "timestamp": "2025-01-15T10:31:00"
}
```

#### 4. Sesión Finalizando
```json
{
  "type": "session_ending",
  "reason": "expired",  // o "limit_reached"
  "summary": {
    "total_alerts_generated": 20,
    "places_discovered": 15,
    "distance_walked_km": 2.5,
    "duration_minutes": 60,
    "interactions": {
      "saved": 5,
      "dismissed": 10,
      "tapped": 5
    }
  },
  "timestamp": "2025-01-15T11:00:00"
}
```

#### 5. Sesión Pausada
```json
{
  "type": "session_paused",
  "message": "Sesión pausada. Reactívala para continuar."
}
```

#### 6. Error
```json
{
  "type": "error",
  "error": "Sesión no válida o expirada",
  "error_code": "SESSION_INVALID",
  "timestamp": "2025-01-15T10:30:00"
}
```

---

## 🔧 Implementación en React Native

### 1. Hook Personalizado para WebSocket

```typescript
// hooks/useExplorationWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface Alert {
  id: string;
  place: any;
  distance_meters: number;
  priority: 'high' | 'medium' | 'low';
  message: string;
  match_score: number;
  estimated_time_minutes: number;
}

interface SessionInfo {
  time_remaining_minutes: number;
  alerts_remaining: number;
  places_discovered: number;
  distance_walked_km: number;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export const useExplorationWebSocket = (
  userId: string,
  sessionId: string,
  onNewAlerts?: (alerts: Alert[]) => void,
  onSessionUpdate?: (info: SessionInfo) => void,
  onSessionEnding?: (reason: string, summary: any) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(
        `ws://tu-servidor.com/api/v1/exploration/ws/${userId}/${sessionId}`
      );

      ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 Mensaje recibido:', message.type);

          switch (message.type) {
            case 'connection_established':
              console.log('🌐 Conexión establecida:', message.session_id);
              break;

            case 'new_alerts':
              if (onNewAlerts && message.alerts) {
                onNewAlerts(message.alerts);
              }
              if (onSessionUpdate && message.session_info) {
                onSessionUpdate(message.session_info);
              }
              break;

            case 'session_update':
              if (onSessionUpdate && message.session_info) {
                onSessionUpdate(message.session_info);
              }
              break;

            case 'session_ending':
              if (onSessionEnding) {
                onSessionEnding(message.reason, message.summary);
              }
              // Cerrar conexión
              disconnect();
              break;

            case 'session_paused':
              console.log('⏸️ Sesión pausada');
              break;

            case 'error':
              console.error('❌ Error del servidor:', message.error);
              setError(message.error);
              break;

            case 'pong':
              // Keep-alive response
              break;

            default:
              console.warn('⚠️ Tipo de mensaje desconocido:', message.type);
          }
        } catch (err) {
          console.error('Error parseando mensaje:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Error de WebSocket:', error);
        setError('Error de conexión');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket cerrado:', event.code, event.reason);
        setIsConnected(false);

        // Reconectar automáticamente si no fue cierre intencional
        if (event.code !== 1000) {
          console.log('🔄 Intentando reconectar en 3 segundos...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creando WebSocket:', err);
      setError('No se pudo conectar');
    }
  }, [userId, sessionId, onNewAlerts, onSessionUpdate, onSessionEnding]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Disconnect by user');
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const sendLocationUpdate = useCallback((latitude: number, longitude: number, accuracy?: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'location_update',
        latitude,
        longitude,
        accuracy,
      }));
    } else {
      console.warn('⚠️ WebSocket no está conectado');
    }
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  const requestStatus = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get_status' }));
    }
  }, []);

  // Conectar al montar
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Keep-alive ping cada 30 segundos
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendPing();
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected, sendPing]);

  return {
    isConnected,
    error,
    sendLocationUpdate,
    sendPing,
    requestStatus,
    disconnect,
  };
};
```

### 2. Componente de Exploración con WebSocket

```typescript
// screens/ExplorationScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert as RNAlert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { useExplorationWebSocket } from '../hooks/useExplorationWebSocket';

const ExplorationScreen = ({ route }) => {
  const { userId, sessionId } = route.params;

  const [alerts, setAlerts] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // 🌐 WebSocket Hook
  const {
    isConnected,
    error,
    sendLocationUpdate,
  } = useExplorationWebSocket(
    userId,
    sessionId,
    // Callback cuando llegan nuevas alertas
    (newAlerts) => {
      console.log('🚨 Nuevas alertas recibidas:', newAlerts.length);
      setAlerts(prev => [...prev, ...newAlerts]);

      // Mostrar notificación visual
      if (newAlerts.length > 0) {
        RNAlert.alert(
          '🎯 Nuevo lugar cercano!',
          newAlerts[0].message,
          [{ text: 'Ver', onPress: () => {} }]
        );
      }
    },
    // Callback cuando se actualiza la sesión
    (info) => {
      setSessionInfo(info);
    },
    // Callback cuando la sesión termina
    (reason, summary) => {
      console.log('⏹️ Sesión terminada:', reason);
      RNAlert.alert(
        'Sesión Finalizada',
        `Descubriste ${summary?.places_discovered || 0} lugares!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  );

  // 📍 Tracking de ubicación
  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        setUserLocation({ latitude, longitude });

        // 📤 Enviar ubicación vía WebSocket
        if (isConnected) {
          sendLocationUpdate(latitude, longitude, accuracy);
        }
      },
      (error) => console.error('Error de ubicación:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 50, // Actualizar cada 50 metros
        interval: 10000, // o cada 10 segundos
      }
    );

    return () => Geolocation.clearWatch(watchId);
  }, [isConnected, sendLocationUpdate]);

  return (
    <View style={styles.container}>
      {/* Estado de conexión */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </Text>
        {sessionInfo && (
          <Text style={styles.metricsText}>
            ⏱️ {sessionInfo.time_remaining_minutes} min |
            🎯 {sessionInfo.alerts_remaining} alertas |
            📍 {sessionInfo.places_discovered} lugares
          </Text>
        )}
      </View>

      {/* Mapa */}
      <MapView
        style={styles.map}
        region={userLocation && {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
      >
        {/* Marcadores de alertas */}
        {alerts.map((alert) => (
          <Marker
            key={alert.id}
            coordinate={{
              latitude: alert.place.coords.latitude,
              longitude: alert.place.coords.longitude,
            }}
            title={alert.place.name}
            description={alert.message}
            pinColor={
              alert.priority === 'high' ? 'red' :
              alert.priority === 'medium' ? 'orange' : 'blue'
            }
          />
        ))}
      </MapView>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 10,
    zIndex: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricsText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  map: {
    flex: 1,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
  },
});

export default ExplorationScreen;
```

---

## 🔥 Ventajas de WebSocket vs Polling

| Aspecto | Polling (HTTP) | WebSocket |
|---------|---------------|-----------|
| **Latencia** | 15-30 segundos | < 1 segundo |
| **Eficiencia** | Request por cada actualización | Conexión persistente |
| **Consumo datos** | Alto (headers HTTP repetidos) | Bajo (solo payload) |
| **UX** | Alertas con delay | Alertas instantáneas |
| **Servidor** | Múltiples requests | 1 conexión |
| **Complejidad** | Simple | Media |

---

## 🛡️ Manejo de Errores y Reconexión

### Estrategia de Reconexión:

```typescript
const RECONNECT_DELAYS = [1000, 3000, 5000, 10000, 30000]; // ms

let reconnectAttempt = 0;

ws.onclose = (event) => {
  if (event.code !== 1000 && reconnectAttempt < RECONNECT_DELAYS.length) {
    const delay = RECONNECT_DELAYS[reconnectAttempt];
    console.log(`Reconectando en ${delay}ms...`);

    setTimeout(() => {
      reconnectAttempt++;
      connect();
    }, delay);
  } else {
    // Demasiados intentos, mostrar error al usuario
    setError('No se pudo conectar al servidor');
  }
};
```

### Códigos de Cierre WebSocket:

- `1000`: Cierre normal (intencional)
- `1001`: Endpoint desaparecido
- `1006`: Conexión perdida sin handshake
- `1011`: Error del servidor

---

## 📊 Monitoreo y Debug

### Logs del Servidor:

```python
# Activar logs debug en FastAPI
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Logs del Cliente:

```typescript
// Habilitar logs detallados
const DEBUG = __DEV__;

if (DEBUG) {
  ws.onmessage = (event) => {
    console.log('📨 [WS] Received:', event.data);
    // ... resto del código
  };
}
```

---

## 🎯 Flujo Completo

```
1. Usuario inicia sesión
   POST /exploration/session/start
   ↓
2. App conecta a WebSocket
   WS /exploration/ws/{user_id}/{session_id}
   ↓
3. Servidor confirma conexión
   → { type: "connection_established" }
   ↓
4. App envía ubicación
   ← { type: "location_update", lat: ..., lng: ... }
   ↓
5. Servidor procesa y genera alertas con AI
   ↓
6. Servidor PUSH alertas instantáneamente
   → { type: "new_alerts", alerts: [...] }
   ↓
7. App muestra marcadores en mapa
   + Notificación push local
   ↓
8. Sesión expira
   → { type: "session_ending", reason: "expired" }
   ↓
9. WebSocket se cierra
```

---

## ✅ Checklist de Implementación

- [x] Manager de conexiones WebSocket
- [x] Endpoint WS en `/exploration/ws/{user_id}/{session_id}`
- [x] Manejo de mensajes bidireccionales
- [x] Push de alertas en tiempo real
- [x] Notificaciones de estado de sesión
- [x] Manejo de errores y reconexión
- [ ] Autenticación en WebSocket (opcional con token)
- [ ] Rate limiting por usuario
- [ ] Métricas y monitoreo

---

## 🚀 ¡Listo para Usar!

El WebSocket está completamente funcional. La experiencia de usuario ahora es:

✨ **Alertas instantáneas** - Sin esperar polling
🗺️ **Mapa en vivo** - Marcadores aparecen en tiempo real
🔋 **Eficiente** - Menos consumo de batería y datos
🎯 **UX mejorada** - Notificaciones push inmediatas

¡Perfecto para combinar con el mapa de React Native! 🎉
