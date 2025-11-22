# 🔧 Fix para Mapa Mostrando JSON

## 🎯 Problema Reportado

El usuario ve JSON en lugar del mapa con marcadores visuales.

---

## ✅ Cambios Implementados

### 1. **Detección Automática de String JSON**

**Archivo:** `src/screens/Search/Search.tsx`

**Cambio:** Ahora el código detecta si el backend devuelve un string JSON en lugar de un objeto parseado y lo convierte automáticamente.

```typescript
// Si la respuesta es un string (JSON sin parsear), intentar parsearlo
let parsedResponse = response;
if (typeof response === 'string') {
  console.warn('⚠️ La respuesta es un string, intentando parsear JSON...');
  try {
    parsedResponse = JSON.parse(response);
    console.log('✅ JSON parseado correctamente');
  } catch (parseError) {
    console.error('❌ Error parseando JSON:', parseError);
    throw new Error('El backend devolvió texto plano en lugar de JSON');
  }
}
```

**Por qué:** A veces el backend puede devolver JSON como texto plano si falta el header `Content-Type: application/json`.

---

### 2. **Logging Detallado Agregado**

Se agregaron logs en cada paso del proceso para identificar dónde falla:

```typescript
console.log('📦 Respuesta completa del backend:', JSON.stringify(response, null, 2));
console.log('📦 Tipo de respuesta:', typeof response);

console.log(`✅ Se recibieron ${parsedResponse.recommendations.length} recomendaciones`);

console.log(`📍 Procesando lugar ${index + 1}:`, rec);

console.log(`✅ ${formattedPlaces.length} lugares formateados correctamente`);

console.log(`🗺️ Mostrando ${filtered.length} lugares en el mapa`);
console.log('Primeros 3 lugares:', filtered.slice(0, 3).map(p => ({
  name: p.name,
  lat: p.lat,
  lng: p.lng,
  score: p.score
})));
```

**Por qué:** Estos logs permiten ver exactamente en qué paso del proceso está el problema.

---

### 3. **Validaciones Mejoradas**

Se agregaron múltiples validaciones para detectar problemas específicos:

```typescript
// Valida que la respuesta exista
if (!response) {
  throw new Error('El backend no devolvió ninguna respuesta');
}

// Valida que sea un objeto con el campo recommendations
if (!parsedResponse.recommendations || !Array.isArray(parsedResponse.recommendations)) {
  console.error('❌ Formato inesperado:', parsedResponse);
  throw new Error('El backend no devolvió recomendaciones en el formato esperado');
}

// Valida que haya datos
if (parsedResponse.recommendations.length === 0) {
  setAiReasoning('No encontré lugares que coincidan con tus intereses en esta área.');
  setResults([]);
  return;
}

// Valida cada lugar individualmente
if (!rec.place) {
  console.warn(`⚠️ Recomendación ${index + 1} no tiene campo 'place':`, rec);
  return null;
}
```

**Por qué:** Prevenir errores silenciosos y mostrar mensajes específicos.

---

### 4. **Mensajes de Error Descriptivos**

Los errores ahora explican exactamente qué salió mal:

```typescript
let errorMessage = 'Error al obtener recomendaciones';

if (err.message?.includes('Network')) {
  errorMessage = 'No se pudo conectar con el backend. Verifica que esté corriendo.';
} else if (err.message?.includes('formato esperado')) {
  errorMessage = 'El backend devolvió datos en formato incorrecto. Revisa los logs.';
} else if (err.response?.status === 401) {
  errorMessage = 'Tu sesión expiró. Por favor, vuelve a iniciar sesión.';
} else if (err.response?.status === 500) {
  errorMessage = 'Error en el servidor. Revisa los logs del backend.';
}

setError(errorMessage);
```

**Por qué:** El usuario sabrá exactamente qué verificar.

---

## 🧪 Cómo Probar los Cambios

### Paso 1: Reinicia el Frontend

```bash
# Ctrl+C para detener
npm start
# Presiona 'r' para reload
```

### Paso 2: Abre la Consola del Navegador

1. Abre DevTools (F12)
2. Ve a la pestaña "Console"
3. Limpia la consola (botón 🚫)

### Paso 3: Ve al Mapa

1. Abre la app
2. Ve a "Búsqueda" o "Recomendaciones"
3. Observa los logs en consola

### Paso 4: Analiza los Logs

Busca estos logs en orden:

```
📦 Respuesta completa del backend: {...}
  ↓ Este muestra TODO lo que devuelve el backend

📦 Tipo de respuesta: object  (o "string" si hay problema)
  ↓ Debe ser "object", si es "string" hay un problema

✅ Se recibieron X recomendaciones
  ↓ Si ves esto, el backend respondió bien

📍 Procesando lugar 1: {...}
📍 Procesando lugar 2: {...}
  ↓ Muestra cada lugar siendo procesado

✅ X lugares formateados correctamente
  ↓ Cuántos lugares se formatearon

🗺️ Mostrando X lugares en el mapa
  ↓ Cuántos lugares se envían al mapa

Primeros 3 lugares: [...]
  ↓ Datos de los primeros 3 lugares
```

---

## 🔍 Diagnóstico Según los Logs

### Escenario 1: No ves ningún log

**Problema:** La función `performSearch` no se está ejecutando.

**Solución:**
- Verifica que el usuario esté autenticado
- Verifica que haya intereses configurados
- Revisa la consola por errores de JavaScript

---

### Escenario 2: Ves "📦 Tipo de respuesta: string"

**Problema:** El backend está devolviendo JSON como texto plano.

**¿Qué hace el código?**
El código automáticamente intenta parsearlo y debería funcionar.

**Si sigue fallando:**
Verifica que el backend tenga:
```python
return JSONResponse(content={...})
# O
@app.post(..., response_model=RecommendationsResponse)
```

---

### Escenario 3: Ves "❌ Formato inesperado"

**Problema:** El backend no devuelve el formato correcto.

**Busca en los logs:**
```
📦 Respuesta completa del backend: {...}
```

**Debe tener esta estructura:**
```json
{
  "recommendations": [
    {
      "place": {
        "id": "...",
        "name": "...",
        "coords": {
          "latitude": -33.4489,
          "longitude": -70.6693
        },
        ...
      },
      "score": 0.95,
      "reasoning": "...",
      "match_interests": [...]
    }
  ],
  "reasoning": "..."
}
```

**Si falta algo:**
Revisa el backend (probablemente el endpoint `/recommendations/generate`).

---

### Escenario 4: Ves "✅ X lugares formateados" pero X = 0

**Problema:** Las recomendaciones no tienen el campo `place`.

**Busca en los logs:**
```
⚠️ Recomendación 1 no tiene campo 'place': {...}
```

**Solución:**
El backend debe enviar `place` dentro de cada recomendación.

---

### Escenario 5: Todo se ve bien en logs pero no hay marcadores en el mapa

**Problema:** El componente MapContainer no está renderizando.

**Verifica:**
1. ¿Ves el mapa de OpenStreetMap (sin marcadores)?
   - **SÍ:** Los datos no llegan al mapa
   - **NO:** El mapa no se está cargando

2. Si el mapa carga pero sin marcadores:
   - Abre React DevTools
   - Busca el componente `MapContainer`
   - Verifica la prop `markers`
   - Debe tener un array con objetos que tengan `lat` y `lng`

---

### Escenario 6: Ves JSON en la pantalla (el problema original)

**Posibles causas:**

1. **El error se está mostrando:**
   - Busca en la pantalla un componente de error
   - Revisa `styles.errorText`

2. **Algo está renderizando el response como texto:**
   - No debería pasar con el código actual
   - Pero verifica que no haya un `<Text>{JSON.stringify(...)}</Text>` escondido

3. **El componente ResultsList o MapContainer está fallando:**
   - React puede mostrar el fallback con datos crudos
   - Revisa errores en consola

---

## 📝 Checklist de Diagnóstico

Usa esta lista para verificar qué está funcionando:

### Logs en Consola:
- [ ] Veo "📦 Respuesta completa del backend"
- [ ] Veo "📦 Tipo de respuesta: object" (no "string")
- [ ] Veo "✅ Se recibieron X recomendaciones" (X > 0)
- [ ] Veo "📍 Procesando lugar 1", "📍 Procesando lugar 2", etc.
- [ ] Veo "✅ X lugares formateados correctamente" (X > 0)
- [ ] Veo "🗺️ Mostrando X lugares en el mapa" (X > 0)
- [ ] Veo "Primeros 3 lugares: [...]" con datos válidos

### Datos Válidos:
- [ ] En "Primeros 3 lugares", cada lugar tiene `name`
- [ ] En "Primeros 3 lugares", cada lugar tiene `lat` != 0
- [ ] En "Primeros 3 lugares", cada lugar tiene `lng` != 0
- [ ] En "Primeros 3 lugares", cada lugar tiene `score`

### Interfaz:
- [ ] Veo el banner "🤖 [razonamiento de la IA]"
- [ ] Veo la lista de lugares en el sidebar (izquierda)
- [ ] Veo el mapa de OpenStreetMap en la derecha
- [ ] Veo marcadores (círculos azules) en el mapa
- [ ] Al hacer clic en un marcador, se abre un popup con detalles

---

## 🐛 Errores Comunes

### Error: "Cannot read property 'recommendations' of undefined"

**Causa:** `response` es `undefined`.

**Lo que hace el nuevo código:**
```typescript
if (!response) {
  throw new Error('El backend no devolvió ninguna respuesta');
}
```

Ahora verás un mensaje claro.

---

### Error: "Unexpected token < in JSON"

**Causa:** El backend devolvió HTML (probablemente un error 500 o página de error).

**Lo que hace el nuevo código:**
El tipo será "string" pero no será JSON válido, mostrará:
```
❌ Error parseando JSON: SyntaxError: Unexpected token <
```

**Solución:** Revisa el backend, está devolviendo HTML de error.

---

### Error: El mapa muestra "Loading..." infinito

**Causa:** La petición nunca termina.

**Solución:**
1. Abre DevTools → Network
2. Busca la petición a `/recommendations/generate`
3. Verifica:
   - ¿Está pendiente? → Timeout o backend no responde
   - ¿Devuelve error? → Revisa el status code y respuesta

---

## 🎉 Resultado Esperado

Si todo funciona correctamente, deberías ver:

### En la Consola:
```
📦 Respuesta completa del backend: {
  "recommendations": [...],
  "reasoning": "..."
}
📦 Tipo de respuesta: object
✅ Se recibieron 10 recomendaciones
📍 Procesando lugar 1: {...}
📍 Procesando lugar 2: {...}
...
✅ 10 lugares formateados correctamente
🗺️ Mostrando 10 lugares en el mapa
Primeros 3 lugares: [
  {name: "Museo de Arte", lat: -33.44, lng: -70.66, score: 0.95},
  {name: "Parque Central", lat: -33.45, lng: -70.67, score: 0.92},
  {name: "Café Moderno", lat: -33.43, lng: -70.65, score: 0.88}
]
```

### En la Pantalla:
- **Banner superior:** "🤖 He seleccionado estos lugares basándome en..."
- **Sidebar izquierdo:** Lista de lugares con botones "Ver en mapa"
- **Mapa derecho:** Mapa de OpenStreetMap con marcadores azules
- **Al hacer clic en marcador:** Popup con foto, nombre, rating, score de match, intereses coincidentes

---

## 📞 Siguiente Paso

**Después de reiniciar el frontend y probar:**

1. Copia TODOS los logs de la consola (desde "📦 Respuesta completa..." hasta el final)
2. Indica qué ves en la pantalla:
   - ¿Mapa con marcadores?
   - ¿JSON como texto?
   - ¿Mensaje de error?
   - ¿Loading infinito?
3. Toma un screenshot si es posible

Con esa información podré decirte exactamente qué está fallando.

---

## 📁 Archivos Modificados

1. ✅ `src/screens/Search/Search.tsx`
   - Detección de string JSON
   - Parseo automático
   - Logs detallados
   - Validaciones mejoradas
   - Mensajes de error específicos

2. ✅ `TROUBLESHOOTING_MAPA.md`
   - Agregado "Error 1: Backend devolvió texto plano"
   - Renumerados los errores

3. ✅ `MAPA_JSON_FIX.md` (este archivo)
   - Documentación completa del fix
   - Guía de diagnóstico

---

**Última actualización:** 2025-10-22
**Versión:** 2.4.0 (String JSON Detection)
**Estado:** ✅ Listo para Probar
