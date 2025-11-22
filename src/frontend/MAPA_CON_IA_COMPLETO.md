# 🤖 Mapa con Recomendaciones de IA - Integración Completa

## ✅ ¿Qué se logró?

El mapa ahora muestra **recomendaciones personalizadas generadas por el agente de IA del backend**, en lugar de una búsqueda manual. Cada lugar es recomendado específicamente para el usuario basándose en:

- 🎯 **Intereses del usuario** (configurados en el perfil)
- 📍 **Ubicación actual** del usuario
- 🧠 **Razonamiento de la IA** (por qué recomienda cada lugar)
- ⭐ **Score de match** (qué tan bien coincide con tus preferencias)

---

## 🎨 Nuevas Características

### 1. 🤖 Banner de Razonamiento de la IA

En la parte superior de la pantalla aparece un banner azul que explica:
- Por qué la IA eligió esos lugares
- En qué se basó para las recomendaciones
- Contexto general de las sugerencias

**Ejemplo:**
```
┌────────────────────────────────────────┐
│ 🤖 He seleccionado estos lugares      │
│ considerando tu interés en cultura,   │
│ gastronomía y naturaleza.             │
└────────────────────────────────────────┘
```

### 2. 🎯 Score de Match en las Tarjetas

Cada tarjeta del mapa muestra un badge verde con el porcentaje de match:

```
🎯 Match 95%
```

Esto indica qué tan bien coincide el lugar con tus preferencias.

### 3. ✓ Intereses Coincidentes

Las tarjetas muestran qué intereses tuyos coinciden con el lugar:

```
Coincide con tus intereses:
✓ cultura  ✓ gastronomía  ✓ arte
```

### 4. 📝 Razonamiento Personalizado

Cada tarjeta incluye una explicación de por qué la IA recomienda ese lugar:

```
┌────────────────────────────────────────┐
│ Por qué te lo recomendamos:           │
│ Este museo combina arte moderno con   │
│ exposiciones interactivas, perfecto   │
│ para tu interés en cultura y arte.    │
└────────────────────────────────────────┘
```

---

## 🗺️ Ejemplo de Tarjeta Completa

```
┌─────────────────────────────────────────┐
│ [Foto del lugar 300x120px]              │
│                                          │
│ 🎯 Match 95%                            │
│                                          │
│ 🏛️ Museo de Arte Moderno               │
│ ⭐ 4.8 estrellas                        │
│ 📍 Av. Cultural 456, Santiago           │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Por qué te lo recomendamos:        │ │
│ │ Este museo combina arte moderno    │ │
│ │ con exposiciones interactivas...   │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Precio: €€€                             │
│ [museum]                                │
│                                          │
│ Coincide con tus intereses:             │
│ ✓ cultura  ✓ arte                      │
│                                          │
│ Fuente: google                          │
└─────────────────────────────────────────┘
```

---

## 🔄 Cómo Funciona

### Flujo Completo:

1. **Usuario abre la pantalla "Recomendaciones IA"**
2. **Frontend obtiene:**
   - User ID del usuario autenticado
   - Ubicación actual (GPS o default)
   - Intereses configurados en el perfil
3. **Llama al backend:**
   ```typescript
   recommendationsService.generate({
     user_id: user.uid,
     location: { latitude: -33.4489, longitude: -70.6693 },
     limit: 20,
     categories: ['cultura', 'gastronomía', 'naturaleza']
   })
   ```
4. **Backend (agente de IA) procesa:**
   - Lee el perfil del usuario de Firebase
   - Analiza intereses y preferencias
   - Busca lugares en Google Places API
   - **Usa IA (Groq/LLaMA) para:**
     - Filtrar lugares relevantes
     - Calcular score de match
     - Generar razonamiento personalizado
     - Identificar qué intereses coinciden
5. **Devuelve respuesta:**
   ```json
   {
     "recommendations": [
       {
         "place": { ...datos del lugar... },
         "score": 0.95,
         "reasoning": "Este museo combina...",
         "match_interests": ["cultura", "arte"]
       }
     ],
     "reasoning": "He seleccionado estos lugares..."
   }
   ```
6. **Frontend muestra:**
   - Banner con razonamiento general
   - Marcadores en el mapa (🔵 normales, 🔴 seleccionado)
   - Tarjetas con toda la información al hacer clic

---

## 📊 Datos que Maneja

### Entrada (lo que enviamos al backend):

| Campo | Tipo | Ejemplo | Descripción |
|-------|------|---------|-------------|
| `user_id` | string | `"abc123"` | ID del usuario Firebase |
| `location` | object | `{latitude: -33.4489, longitude: -70.6693}` | Ubicación actual |
| `limit` | number | `20` | Máximo de recomendaciones |
| `categories` | array | `["cultura", "food"]` | Intereses del usuario |

### Salida (lo que recibimos del backend):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `recommendations[]` | array | Lista de lugares recomendados |
| `recommendations[].place` | object | Datos del lugar (nombre, coords, fotos, etc.) |
| `recommendations[].score` | float | Score de 0 a 1 (qué tan bien coincide) |
| `recommendations[].reasoning` | string | Por qué la IA recomienda este lugar |
| `recommendations[].match_interests` | array | Intereses que coinciden |
| `reasoning` | string | Razonamiento general de todas las recomendaciones |

---

## 🎯 Ordenamiento Inteligente

Los lugares se ordenan por:
1. **Score de la IA** (mayor primero) ⭐
2. **Rating del lugar** (si no hay score)
3. **Distancia** (solo para información, no afecta orden)

---

## 🔍 Filtro de Búsqueda

Aunque son recomendaciones automáticas, puedes filtrar por texto:
- Buscar por nombre del lugar
- Buscar por categoría
- Buscar por dirección

**Ejemplo:**
```
Escribe "museo" → Filtra solo museos de las recomendaciones
```

---

## 🚀 Para Probarlo

### 1. Configura tus intereses:
- Ve a **Perfil** → "Seleccionar intereses"
- Elige: cultura, gastronomía, naturaleza, etc.
- Guarda cambios

### 2. Inicia el backend:
```bash
cd C:\Users\josej\OneDrive\Documentos\TAi-joseesk\TAi-joseesk\src\backend\TAi_backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Verifica que funciona:
- http://localhost:8000/docs
- Prueba el endpoint `/api/v1/recommendations/generate`

### 4. Abre la app:
```bash
npm start
```

### 5. Ve a "Recomendaciones IA":
- Verás el banner con razonamiento
- Mapa con marcadores de lugares
- Haz clic en un marcador para ver la tarjeta completa

---

## 🎨 Colores y Estilos

### Banner de IA:
- Fondo: Azul claro (`#dbeafe`)
- Texto: Azul oscuro (`#1e40af`)
- Borde izquierdo: Azul (`#3b82f6`)
- Ícono: 🤖

### Score de Match:
- Fondo: Gradiente verde (`#10b981` → `#059669`)
- Texto: Blanco
- Ícono: 🎯

### Intereses Coincidentes:
- Fondo: Amarillo claro (`#fef3c7`)
- Texto: Marrón (`#92400e`)
- Check: ✓

### Razonamiento:
- Fondo: Gris muy claro (`#f9fafb`)
- Borde izquierdo: Azul (`#3b82f6`)
- Padding y bordes redondeados

---

## 🐛 Troubleshooting

### No aparecen recomendaciones:
- **Verifica:** Que tienes intereses configurados en tu perfil
- **Solución:** Ve a Perfil → Seleccionar al menos 2-3 intereses

### Banner de IA vacío:
- **Causa:** Backend no devolvió `reasoning`
- **Check:** Logs del backend para ver si hay errores

### Score no aparece:
- **Verifica:** Que el backend devuelve `score` en cada recomendación
- **Formato:** Debe ser un número entre 0 y 1

### Intereses no coinciden:
- **Verifica:** Que los intereses del backend coinciden con los del frontend
- **Nombres:** Deben ser exactamente iguales (case-sensitive)

---

## 💡 Diferencias vs Búsqueda Manual

| Característica | Recomendaciones IA | Búsqueda Manual |
|----------------|-------------------|-----------------|
| **Quién decide** | Agente de IA | Usuario escribe |
| **Basado en** | Perfil + Intereses | Texto de búsqueda |
| **Razonamiento** | ✅ Sí, explicado | ❌ No |
| **Score de match** | ✅ Sí, calculado | ❌ No |
| **Personalización** | ✅ Total | ⚠️ Parcial |
| **Cantidad** | Limitada (mejores) | Todos los que coincidan |

---

## 🔮 Futuras Mejoras

### 🎯 Mejorar recomendaciones:
- Aprender de favoritos del usuario
- Considerar historial de visitas
- Ajustar según feedback (like/dislike)

### 🗺️ Mejorar mapa:
- Clustering de marcadores cercanos
- Rutas sugeridas entre lugares
- Vista 3D de lugares

### 🤖 Más IA:
- Chat integrado en las tarjetas
- "¿Por qué este lugar?" → Explicación expandida
- Generar itinerario desde recomendaciones

---

## 📝 Archivos Modificados

1. ✅ `src/screens/Search/Search.tsx`
   - Cambiado `placesService` → `recommendationsService`
   - Agregado banner de razonamiento IA
   - Procesamiento de score e intereses

2. ✅ `src/components/search/MapContainer.tsx`
   - Agregado `score` y `matchInterests` en interface
   - Tarjetas mejoradas con badge de match
   - Sección de intereses coincidentes
   - Razonamiento personalizado destacado

3. ✅ `src/api/services.ts`
   - Ya tenía `recommendationsService.generate()` listo

---

## 🎉 Resultado Final

La pantalla "Recomendaciones IA" ahora:
- ✅ Muestra lugares **seleccionados por IA**
- ✅ Explica **por qué recomienda cada lugar**
- ✅ Muestra **score de match** (0-100%)
- ✅ Lista **intereses coincidentes**
- ✅ Banner con **razonamiento general**
- ✅ Tarjetas **ricas en información**
- ✅ Ordenamiento **inteligente por relevancia**
- ✅ Experiencia **totalmente personalizada**

---

## 📸 Capturas de Pantalla (Descripción)

### Vista General:
```
┌────────────────────────────────────────────┐
│ Recomendaciones IA    [Preferencias] [Mapa]│
├────────────────────────────────────────────┤
│ 🤖 He seleccionado estos lugares basándome│
│ en tu interés en cultura, gastronomía...  │
├──────────────┬─────────────────────────────┤
│              │                             │
│  Barra       │        🗺️ MAPA             │
│  Búsqueda    │                             │
│              │    🔵 (85%)                 │
│  📝 Lista    │       🔴 (95%) ← tarjeta   │
│  - Museo 95% │    🔵 (72%)                 │
│  - Café  85% │                             │
│  - Park  72% │                             │
│              │                             │
└──────────────┴─────────────────────────────┘
```

¡Ahora tu app tiene recomendaciones con IA de verdad! 🚀
