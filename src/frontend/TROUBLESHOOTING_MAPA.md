# 🗺️ Troubleshooting - Mapa Muestra JSON en Lugar de Marcadores

## 🔴 Problema

El mapa muestra el **JSON crudo** del backend en lugar de los marcadores visuales con los lugares.

---

## 🔍 Diagnóstico

### Paso 1: Verificar Logs del Frontend

Abre la consola del navegador (F12) o los logs de Expo y busca:

```
📦 Respuesta completa del backend: {...}
✅ Se recibieron X recomendaciones
✅ X lugares formateados correctamente
🗺️ Mostrando X lugares en el mapa
```

### Paso 2: Identificar el Problema

#### ✅ Si ves los logs anteriores:
- El backend está respondiendo correctamente
- El problema está en el renderizado del mapa

#### ❌ Si ves errores como:
```
❌ Formato inesperado: {...}
❌ Error getting recommendations: ...
```
- El backend no está devolviendo el formato correcto

---

## 🛠️ Soluciones Según el Error

### Error 1: "El backend devolvió texto plano en lugar de JSON"

**Causa:** El backend está devolviendo un string JSON en lugar de un objeto parseado.

**Síntoma en logs:**
```
📦 Tipo de respuesta: string
⚠️ La respuesta es un string, intentando parsear JSON...
```

**Solución:**
1. Verifica que el backend devuelva con header `Content-Type: application/json`
2. El frontend ahora intenta parsear automáticamente si detecta un string
3. Si sigue fallando, revisa el endpoint del backend

### Error 2: "El backend no devolvió recomendaciones en el formato esperado"

**Causa:** El backend devuelve algo diferente a lo esperado.

**Verifica en el backend que devuelva:**
```json
{
  "recommendations": [
    {
      "place": {
        "id": "place_123",
        "name": "Museo de Arte",
        "coords": {
          "latitude": -33.4489,
          "longitude": -70.6693
        },
        "rating": 4.5,
        "address": "Av. Principal 123",
        "categories": ["museum"],
        "photos": ["https://..."],
        "priceLevel": 2
      },
      "score": 0.95,
      "reasoning": "Este museo...",
      "match_interests": ["culture", "art"]
    }
  ],
  "reasoning": "He seleccionado estos lugares..."
}
```

**NO debe devolver:**
- Un string JSON (debe ser objeto)
- Array directo sin el campo `recommendations`
- Formato diferente

### Error 3: "No se pudo conectar con el backend"

**Causa:** Backend no está corriendo o la URL es incorrecta.

**Solución:**
```bash
# 1. Verifica que el backend esté corriendo
curl http://localhost:8000/health

# 2. Verifica la URL en .env
cat .env
# Debe mostrar: EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1

# 3. Reinicia el backend
cd C:\Users\josej\OneDrive\Documentos\TAi-joseesk\TAi-joseesk\src\backend\TAi_backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Error 4: Logs muestran "0 lugares formateados"

**Causa:** Las coordenadas vienen en formato incorrecto o son 0.

**Verifica en el log:**
```
📍 Procesando lugar 1: {
  "place": {
    "coords": {
      "latitude": -33.4489,  ← Debe existir
      "longitude": -70.6693  ← Debe existir
    }
  }
}
```

**Si coords es null o 0:**
- El backend no está obteniendo coordenadas de Google Places
- Verifica que la API de Google Places esté correctamente configurada

### Error 5: El mapa carga pero sin marcadores

**Causa:** Coordenadas fuera de rango o mapa no centrado.

**Solución:**

1. Verifica que lat/lng no sean 0:
```javascript
console.log('Primeros 3 lugares:', filtered.slice(0, 3));
// Debe mostrar lat y lng != 0
```

2. Asegúrate que el mapa esté centrado en la ubicación correcta:
```typescript
// En Search.tsx línea ~35
const [userLocation, setUserLocation] = useState({
  lat: -33.4489,  // Santiago, Chile
  lng: -70.6693,
});
```

### Error 6: "Tu sesión expiró"

**Causa:** Token de Firebase expirado.

**Solución:**
1. Cierra sesión
2. Vuelve a iniciar sesión
3. Intenta de nuevo

---

## 🧪 Prueba Manual del Backend

Para verificar que el backend funciona correctamente:

### 1. Prueba directa con Swagger

```
http://localhost:8000/docs
```

1. Ve a `/api/v1/recommendations/generate`
2. Haz clic en "Try it out"
3. Usa este JSON de prueba:

```json
{
  "user_id": "test_user_123",
  "location": {
    "latitude": -33.4489,
    "longitude": -70.6693
  },
  "limit": 5,
  "categories": ["culture", "food"]
}
```

4. Haz clic en "Execute"
5. Verifica que la respuesta tenga el formato correcto

### 2. Prueba con curl

```bash
curl -X POST "http://localhost:8000/api/v1/recommendations/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "location": {"latitude": -33.4489, "longitude": -70.6693},
    "limit": 5
  }'
```

**Respuesta esperada:** JSON con `recommendations` y `reasoning`

---

## 🔧 Verificaciones del Frontend

### 1. Verifica que el usuario tenga intereses

```javascript
// En la consola del navegador
console.log(preferences.interests);
// Debe mostrar: ["culture", "food", ...]
```

Si está vacío:
1. Ve a Perfil
2. Selecciona al menos 3 intereses
3. Vuelve al mapa

### 2. Verifica la conexión a internet

El frontend necesita conectarse al backend.

### 3. Verifica que no haya errores de CORS

En los logs del backend busca:
```
Access to XMLHttpRequest has been blocked by CORS policy
```

Si aparece, el backend necesita configurar CORS correctamente.

---

## 📊 Checklist de Verificación

Marca cada item que funcione correctamente:

### Backend:
- [ ] Backend corriendo en puerto 8000
- [ ] `/health` responde OK
- [ ] `/docs` (Swagger UI) se carga
- [ ] Endpoint de recomendaciones responde en Swagger
- [ ] Respuesta tiene formato correcto (con `recommendations`)
- [ ] Cada `place` tiene `coords` con `latitude` y `longitude`
- [ ] Google Places API configurada correctamente
- [ ] CORS habilitado para localhost

### Frontend:
- [ ] `.env` tiene URL correcta
- [ ] Usuario autenticado (iniciado sesión)
- [ ] Usuario tiene intereses configurados (mínimo 3)
- [ ] Logs muestran "Respuesta completa del backend"
- [ ] Logs muestran "X recomendaciones recibidas"
- [ ] Logs muestran "X lugares formateados"
- [ ] Logs muestran coordenadas != 0
- [ ] No hay errores en consola

### Mapa:
- [ ] Componente `MapContainer` se renderiza
- [ ] Mapa de OpenStreetMap carga correctamente
- [ ] `results` tiene datos (ver en React DevTools)
- [ ] Marcadores pasan al `MapContainer`

---

## 🐛 Errores Comunes y Soluciones

### "Cannot read property 'latitude' of undefined"

**Causa:** `coords` no existe en la respuesta.

**Solución:** Verifica que el backend devuelva:
```json
{
  "place": {
    "coords": {
      "latitude": -33.4489,
      "longitude": -70.6693
    }
  }
}
```

### Mapa muestra "Loading..." infinito

**Causa:** La petición no se completa.

**Solución:**
1. Abre DevTools Network
2. Busca la petición a `/recommendations/generate`
3. Verifica status code y respuesta

### "Network request failed"

**Causa:** No puede conectar al backend.

**Solución:**
1. Verifica URL en `.env`
2. Verifica backend corriendo
3. Verifica firewall no bloquea puerto 8000

---

## 📝 Logs Útiles para Debugging

El código ahora incluye logs detallados. Busca en consola:

```
📦 Respuesta completa del backend: {...}
  ↑ Muestra TODA la respuesta del backend

✅ Se recibieron 10 recomendaciones
  ↑ Confirma que llegaron datos

📍 Procesando lugar 1: {...}
📍 Procesando lugar 2: {...}
  ↑ Muestra cada lugar siendo procesado

✅ 10 lugares formateados correctamente
  ↑ Confirma que el formateo funcionó

🗺️ Mostrando 10 lugares en el mapa
  ↑ Confirma que se pasaron al mapa

Primeros 3 lugares: [
  {name: "Museo", lat: -33.44, lng: -70.66, score: 0.95},
  ...
]
  ↑ Muestra datos de los primeros lugares
```

Si NO ves estos logs, el problema está antes de procesar los datos.

---

## 🚀 Solución Rápida (Reset Total)

Si nada funciona, prueba esto:

```bash
# 1. Detén todo
Ctrl+C  (en ambas terminales)

# 2. Backend
cd C:\Users\josej\OneDrive\Documentos\TAi-joseesk\TAi-joseesk\src\backend\TAi_backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Verifica backend
curl http://localhost:8000/health

# 4. Frontend (nueva terminal)
cd C:\Users\josej\OneDrive\Documentos\TAi\src\frontend
npm start

# 5. Borra caché
# Presiona 'r' en Expo para reload
# O cierra navegador y reabre

# 6. Ve al mapa
# Login → Configura intereses (si no los tienes) → Búsqueda
```

---

## 📞 Si el Problema Persiste

1. **Copia los logs completos** de la consola
2. **Copia la respuesta del backend** (el JSON completo)
3. **Toma screenshot** de lo que ves en la pantalla
4. **Verifica** que tengas la última versión del código

---

**Última actualización:** 2024-10-22
**Versión:** 2.3.0 (Debugging Mejorado)
