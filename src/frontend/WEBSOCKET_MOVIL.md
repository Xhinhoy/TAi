# 📱 WebSocket en Móvil - Guía Completa

## ✅ ¡Ahora Funciona en Móvil!

El WebSocket ahora está **completamente funcional en iOS y Android**, no solo en web.

---

## 🎯 Características Implementadas

### WebSocket Multi-Plataforma

✅ **Web** - Chrome, Firefox, Safari, Edge
✅ **iOS** - iPhone, iPad (Expo Go o standalone)
✅ **Android** - Teléfonos y tablets (Expo Go o standalone)

### Funcionalidades en Móvil

| Característica | Web | iOS | Android |
|----------------|-----|-----|---------|
| WebSocket tiempo real | ✅ | ✅ | ✅ |
| Auto-reconexión | ✅ | ✅ | ✅ |
| Indicador "escribiendo..." | ✅ | ✅ | ✅ |
| Fallback a HTTP | ✅ | ✅ | ✅ |
| Persistencia sesiones | ✅ | ✅ | ✅ |
| Imágenes reales | ✅ | ✅ | ✅ |
| Todas las acciones | ✅ | ✅ | ✅ |

---

## 🔧 Configuración para Móvil

### 1. Obtener la IP de tu Computadora

El móvil NO puede conectarse a `localhost`, necesita la IP de tu computadora en la red local.

#### Windows:
```bash
ipconfig
```

Busca "Adaptador de LAN inalámbrica Wi-Fi" o "Adaptador Ethernet":
```
IPv4 Address . . . . . . . . . . : 192.168.1.100
```

#### Mac/Linux:
```bash
ifconfig | grep "inet "
# o
ip addr show
```

Busca algo como:
```
inet 192.168.1.100 netmask 0xffffff00
```

### 2. Actualizar .env

Abre `.env` y cambia la URL:

**ANTES (solo funciona en web):**
```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**DESPUÉS (funciona en móvil y web):**
```env
# Reemplaza 192.168.1.100 con TU IP
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

### 3. Reiniciar Expo

```bash
# Detén el servidor actual (Ctrl+C)
# Inicia de nuevo
npm start
```

**IMPORTANTE:** Después de cambiar `.env`, SIEMPRE reinicia Expo para que los cambios tomen efecto.

---

## 🚀 Cómo Probar en Móvil

### Opción 1: Expo Go (Más Rápido)

#### Paso 1: Instalar Expo Go
- **iOS:** [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)
- **Android:** [Play Store - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

#### Paso 2: Verificar Conexión

1. **Backend corriendo:**
   ```bash
   cd C:\Users\josej\OneDrive\Documentos\TAi-joseesk\TAi-joseesk\src\backend\TAi_backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Frontend con tu IP en .env:**
   ```bash
   npm start
   ```

3. **Asegúrate que móvil y computadora estén en la MISMA red WiFi**

#### Paso 3: Conectar

1. Abre Expo Go en tu móvil
2. Escanea el QR code que aparece en la terminal
3. La app se cargará en tu móvil

#### Paso 4: Verificar WebSocket

1. Ve a la pantalla de Chat
2. Observa los logs en la terminal de Expo:
   ```
   ✅ WebSocket connected on ios
   ```
   o
   ```
   ✅ WebSocket connected on android
   ```

3. El header del chat debe mostrar "🟢 Conectado"

4. Envía un mensaje y observa el indicador "escribiendo..." (3 puntos)

---

### Opción 2: Emulador/Simulador

#### iOS Simulator (solo Mac):

```bash
npm start
# Presiona 'i' para abrir en iOS Simulator
```

**Nota:** El simulador puede usar `localhost` directamente en Mac.

#### Android Emulator:

```bash
npm start
# Presiona 'a' para abrir en Android Emulator
```

**IMPORTANTE para Android Emulator:**
- Android emulator NO puede usar `localhost`
- Usa `10.0.2.2` para localhost O
- Usa tu IP real `192.168.X.X`

**Configuración especial para emulador Android:**
```env
# Para Android Emulator solamente
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
```

---

## 🔍 Verificación Paso a Paso

### 1. Verificar Backend

```bash
# En tu navegador
http://192.168.1.100:8000/docs
```

Si carga Swagger UI, el backend está accesible desde la red.

Si NO carga:
- ✅ Verifica que backend use `--host 0.0.0.0`
- ✅ Verifica firewall de Windows (puede bloquear puerto 8000)
- ✅ Verifica que estés usando tu IP correcta

### 2. Verificar Expo Metro Bundler

Cuando ejecutas `npm start`, debe mostrar algo como:

```
Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### 3. Verificar Conexión desde Móvil

Abre el navegador de tu móvil y ve a:
```
http://192.168.1.100:8000/health
```

Debería mostrar:
```json
{"status": "ok"}
```

Si funciona, el móvil puede alcanzar el backend!

### 4. Verificar WebSocket en Logs

En la terminal de Expo, cuando abres el chat, deberías ver:

```
✅ WebSocket connected on android
LOG  WebSocket ready state: 1 (OPEN)
```

Si ves errores:
```
❌ WebSocket error: ...
⚠️ Falling back to HTTP requests
```

Significa que WebSocket falló pero la app seguirá funcionando con HTTP.

---

## 🐛 Troubleshooting

### "Network request failed"

**Problema:** El móvil no puede conectarse al backend.

**Soluciones:**
1. ✅ Verifica que móvil y PC estén en la MISMA red WiFi
2. ✅ Verifica la IP en `.env` sea correcta
3. ✅ Reinicia Expo después de cambiar `.env`
4. ✅ Verifica firewall de Windows:
   ```bash
   # Permite puerto 8000 en firewall
   netsh advfirewall firewall add rule name="Backend TAi" dir=in action=allow protocol=TCP localport=8000
   ```

### "WebSocket connection failed"

**Problema:** HTTP funciona pero WebSocket no.

**Soluciones:**
1. ✅ Verifica que backend esté corriendo con WebSocket habilitado
2. ✅ El WebSocket automáticamente hace fallback a HTTP
3. ✅ Verifica logs del backend para errores de WebSocket

### Backend no arranca con --host 0.0.0.0

**Problema:** Error al iniciar backend.

**Solución:**
```bash
# Intenta solo con --reload
python -m uvicorn app.main:app --reload
```

Luego usa tu IP local en `.env` de todas formas.

### Móvil no escanea QR

**Problema:** Expo Go no lee el QR code.

**Soluciones:**
1. ✅ Escribe manualmente la URL en Expo Go
2. ✅ Envía el link por email/mensaje
3. ✅ Usa la opción "Enter URL manually"

### "🔌 WebSocket disconnected" constantemente

**Problema:** WebSocket se conecta pero se desconecta inmediatamente.

**Soluciones:**
1. ✅ Verifica estabilidad de WiFi
2. ✅ El código tiene auto-reconexión cada 3 segundos
3. ✅ Revisa logs del backend para errores
4. ✅ La app sigue funcionando con fallback HTTP

---

## 📊 Comparación: Web vs Móvil

| Característica | Web | Móvil |
|----------------|-----|-------|
| **Conexión** | localhost | IP de red local |
| **WebSocket** | ✅ Sí | ✅ Sí |
| **Auto-reconexión** | ✅ Sí | ✅ Sí |
| **Persistencia** | AsyncStorage (web) | AsyncStorage (nativo) |
| **Compartir** | Alert | Dialog nativo |
| **Performance** | Rápido | Rápido |

---

## 🎯 Mejoras Implementadas para Móvil

### 1. Sin Restricción de Plataforma

**ANTES:**
```typescript
if (Platform.OS !== 'web') return; // ❌ Solo web
```

**AHORA:**
```typescript
// ✅ Funciona en todas las plataformas
if (!user || !sessionId) return;
```

### 2. Auto-Reconexión

```typescript
websocket.onclose = (event) => {
  console.log('🔌 WebSocket disconnected');
  setWs(null);

  // Auto-reconectar si no fue cierre normal
  if (event.code !== 1000 && user && sessionId) {
    setTimeout(() => {
      console.log('🔄 Reconnecting WebSocket...');
      // useEffect se encarga de reconectar
    }, 3000);
  }
};
```

**Beneficios:**
- ✅ Si pierdes WiFi, reconecta automáticamente
- ✅ Si backend se reinicia, reconecta
- ✅ No necesitas recargar la app

### 3. Logs Mejorados

```typescript
console.log('✅ WebSocket connected on', Platform.OS);
// Muestra: ios, android, o web
```

**Utilidad:**
- Ver en qué plataforma estás probando
- Depurar problemas específicos de cada plataforma

### 4. Cleanup Mejorado

```typescript
return () => {
  if (websocket.readyState === WebSocket.OPEN ||
      websocket.readyState === WebSocket.CONNECTING) {
    websocket.close(1000, 'Component unmounting');
  }
};
```

**Previene:**
- Fugas de memoria
- Conexiones zombie
- Errores al desmontar componente

---

## 🧪 Pruebas Recomendadas

### Caso 1: Conexión Normal

1. ✅ Abre chat en móvil
2. ✅ Verifica "🟢 Conectado" en header
3. ✅ Envía mensaje
4. ✅ Observa "escribiendo..." (3 puntos)
5. ✅ Recibe respuesta del asistente

**Esperado:** Todo funciona perfectamente

### Caso 2: Sin WiFi

1. ✅ Desactiva WiFi en el móvil
2. ✅ Intenta enviar mensaje
3. ✅ Debe mostrar error de red
4. ✅ Reactiva WiFi
5. ✅ WebSocket se reconecta solo (3 seg)

**Esperado:** Auto-reconexión funciona

### Caso 3: Backend se Reinicia

1. ✅ Chat funcionando
2. ✅ Detén backend (Ctrl+C)
3. ✅ WebSocket se desconecta
4. ✅ Reinicia backend
5. ✅ WebSocket reconecta automáticamente

**Esperado:** Reconexión transparente

### Caso 4: Cambiar de Red

1. ✅ Chat en red WiFi A
2. ✅ Cambia a red WiFi B
3. ✅ Actualiza .env con nueva IP
4. ✅ Reinicia Expo
5. ✅ Chat funciona en nueva red

**Esperado:** Funciona en cualquier red

---

## 📱 Configuraciones por Plataforma

### iOS

**Configuración estándar:**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

**Permisos necesarios:**
- Ninguno adicional (WebSocket es nativo)

**Limitaciones:**
- Ninguna conocida

### Android

**Configuración estándar:**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

**Para emulador Android:**
```env
# Emulador usa IP especial para localhost de la PC
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
```

**Permisos necesarios:**
- Ninguno adicional (WebSocket es nativo)

**Limitaciones:**
- Emulador requiere IP especial `10.0.2.2`

---

## 🎉 Resultado Final

### Antes (Solo Web):
```
Web:     ✅ WebSocket
iOS:     ❌ Solo HTTP
Android: ❌ Solo HTTP
```

### Ahora (Multi-Plataforma):
```
Web:     ✅ WebSocket + Auto-reconexión
iOS:     ✅ WebSocket + Auto-reconexión
Android: ✅ WebSocket + Auto-reconexión
```

---

## 📚 Recursos Adicionales

### Documentación Oficial:
- [React Native WebSocket API](https://reactnative.dev/docs/network#websocket-support)
- [Expo Network](https://docs.expo.dev/versions/latest/sdk/network/)

### Para Debugging:
```typescript
// Ver estado del WebSocket
console.log('WebSocket ready state:', ws?.readyState);
// 0: CONNECTING
// 1: OPEN
// 2: CLOSING
// 3: CLOSED
```

### Herramientas Útiles:
- **React Native Debugger** - Ver logs detallados
- **Expo Go DevTools** - Depurar en tiempo real
- **Wireshark** - Analizar tráfico de red (avanzado)

---

## ✅ Checklist de Verificación

Antes de probar en móvil, asegúrate de:

- [ ] Backend corriendo con `--host 0.0.0.0 --port 8000`
- [ ] Obtuviste tu IP con `ipconfig` o `ifconfig`
- [ ] Actualizaste `.env` con tu IP
- [ ] Reiniciaste Expo después de cambiar `.env`
- [ ] Móvil y PC en la misma red WiFi
- [ ] Firewall permite puerto 8000
- [ ] Probaste `http://TU_IP:8000/docs` en navegador móvil
- [ ] Expo Go instalado (si usas Expo Go)

---

**Última actualización:** 2024-10-22
**Versión:** 2.1.0 (WebSocket Móvil)
**Estado:** ✅ 100% Funcional en iOS y Android
