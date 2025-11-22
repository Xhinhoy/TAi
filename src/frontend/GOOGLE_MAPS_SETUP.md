# Configuración de Google Maps API Key

## 📋 Resumen

Para que los mapas funcionen en TAi, necesitas configurar una API Key de Google Maps en 3 lugares:
1. `.env` (para web y variables de entorno)
2. `app.json` (para iOS)
3. `app.json` (para Android)

---

## 🔑 Paso 1: Obtener tu Google Maps API Key

### 1.1 Ir a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Crea un nuevo proyecto o selecciona uno existente:
   - Click en el selector de proyectos (arriba a la izquierda)
   - Click en "Nuevo Proyecto"
   - Nombre: `TAi-Travel` (o el que prefieras)
   - Click en "Crear"

### 1.2 Habilitar las APIs necesarias

Ve a [APIs & Services > Library](https://console.cloud.google.com/apis/library) y habilita estas APIs:

#### Para Web:
- ✅ **Maps JavaScript API**
- ✅ **Places API** (New)

#### Para Android:
- ✅ **Maps SDK for Android**
- ✅ **Places API** (New)

#### Para iOS:
- ✅ **Maps SDK for iOS**
- ✅ **Places API** (New)

Para habilitar cada una:
1. Busca el nombre de la API en el buscador
2. Click en la API
3. Click en "Habilitar"

### 1.3 Crear credenciales (API Key)

1. Ve a [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click en "+ CREATE CREDENTIALS"
3. Selecciona "API Key"
4. Se generará tu API key → **¡Cópiala!**

### 1.4 Restringir la API Key (IMPORTANTE - Seguridad)

Por seguridad, debes restringir tu API key:

1. Click en el nombre de tu API key recién creada
2. En "Application restrictions":
   - Para **desarrollo local**: Deja "None" temporalmente
   - Para **producción**: Configura restricciones apropiadas
3. En "API restrictions":
   - Selecciona "Restrict key"
   - Marca las APIs que habilitaste:
     - Maps JavaScript API
     - Maps SDK for Android
     - Maps SDK for iOS
     - Places API (New)
4. Click en "Save"

---

## ⚙️ Paso 2: Configurar la API Key en el proyecto

### 2.1 Archivo `.env`

Abre el archivo `.env` en la raíz del proyecto frontend y reemplaza `TU_GOOGLE_MAPS_API_KEY_AQUI`:

```bash
# Google Maps Configuration
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**⚠️ IMPORTANTE**:
- Reemplaza `AIzaSyXXX...` con tu API key real
- **NO** compartas este archivo en Git (ya está en `.gitignore`)
- La variable DEBE empezar con `EXPO_PUBLIC_` para que Expo la reconozca

### 2.2 Archivo `app.json`

Abre `app.json` y reemplaza `TU_GOOGLE_MAPS_API_KEY_AQUI` en **2 lugares**:

#### Para iOS (línea ~21):
```json
"ios": {
  "supportsTablet": true,
  "config": {
    "googleMapsApiKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```

#### Para Android (línea ~33):
```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#ffffff"
  },
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false,
  "config": {
    "googleMaps": {
      "apiKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    }
  }
}
```

**⚠️ IMPORTANTE**:
- Usa la **misma API key** en los 3 lugares (.env, iOS, Android)
- Este archivo SÍ se comparte en Git, así que considera usar variables de entorno en producción

---

## 🧪 Paso 3: Verificar la configuración

### 3.1 Para Web:

```bash
npm run web
```

- Abre la consola del navegador (F12)
- Busca errores relacionados con Google Maps
- Si ves errores como "Google Maps API error: MissingKeyMapError", verifica tu `.env`

### 3.2 Para Android/iOS:

```bash
# Android
npm run android

# iOS
npm run ios
```

- Si los mapas no cargan, verifica que la API key esté correcta en `app.json`
- Verifica que hayas habilitado las APIs correctas en Google Cloud Console

---

## 🔧 Solución de Problemas

### Error: "Google Maps API error: ApiNotActivatedMapError"

**Causa**: Las APIs necesarias no están habilitadas en Google Cloud Console

**Solución**:
1. Ve a [Google Cloud Console - APIs](https://console.cloud.google.com/apis/library)
2. Asegúrate de habilitar todas las APIs mencionadas en el Paso 1.2

### Error: "Google Maps API error: RefererNotAllowedMapError"

**Causa**: Las restricciones de la API key bloquean tu dominio

**Solución**:
1. Ve a [Credentials](https://console.cloud.google.com/apis/credentials)
2. Edita tu API key
3. En "Application restrictions", temporalmente selecciona "None"
4. Guarda y vuelve a probar

### Los mapas no cargan en móvil

**Causa**: API key no configurada correctamente en `app.json`

**Solución**:
1. Verifica que `app.json` tenga la API key correcta
2. Haz `npx expo prebuild --clean` para regenerar las configuraciones nativas
3. Vuelve a ejecutar `npm run android` o `npm run ios`

### Error: "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not defined"

**Causa**: El archivo `.env` no se está cargando correctamente

**Solución**:
1. Asegúrate de que `.env` esté en la raíz del proyecto frontend
2. Detén el servidor de desarrollo (Ctrl+C)
3. Vuelve a iniciar: `npm run web`

---

## 💰 Costos de Google Maps API

### Plan gratuito:
- **$200 USD de crédito mensual gratis**
- Esto equivale aproximadamente a:
  - 28,000 cargas de mapa
  - 40,000 solicitudes de geocodificación
  - 100,000 llamadas a la API de Places

### Para desarrollo:
- No deberías tener ningún costo
- Configura alertas de facturación en Google Cloud Console

### Monitoreo de uso:
1. Ve a [Google Cloud Console - Billing](https://console.cloud.google.com/billing)
2. Click en tu proyecto
3. Ve a "Reports" para ver el uso actual

---

## 📚 Recursos adicionales

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [Places API Docs](https://developers.google.com/maps/documentation/places/web-service)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)

---

## ✅ Checklist Final

Antes de empezar a usar la app, verifica:

- [ ] Has creado un proyecto en Google Cloud Console
- [ ] Has habilitado todas las APIs necesarias (Maps JS, Android, iOS, Places)
- [ ] Has creado una API key
- [ ] Has copiado la API key al archivo `.env`
- [ ] Has copiado la API key a `app.json` (iOS y Android)
- [ ] Has configurado restricciones de seguridad (opcional para desarrollo)
- [ ] Has probado que los mapas carguen correctamente en web
- [ ] Has configurado alertas de facturación (recomendado)

---

**¡Listo!** 🎉 Ahora tu app TAi debería poder mostrar mapas correctamente en todas las plataformas.
