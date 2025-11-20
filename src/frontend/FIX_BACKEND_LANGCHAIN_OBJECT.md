# 🔧 Fix: Backend Devolviendo Objeto LangChain en Lugar de Texto

## 🎯 Problema Identificado

**Error reportado:**
```
Lo siento, hubo un error: Got unknown type content='¡Claro! A continuación...' additional_kwargs={} response_metadata={} type='ai' id='0ed03fe5-b669-4f89-ba52-22d6b6828b89'
```

**Causa raíz:**
El **backend** está devolviendo el **objeto completo de LangChain** (AIMessage) en lugar de solo el **contenido de texto** (string).

---

## 🔍 Análisis del Error

### Qué Debería Devolver el Backend:

```json
{
  "response": "¡Claro! A continuación tienes una selección de museos...",
  "actions": [],
  "places": []
}
```

### Qué Está Devolviendo:

```json
{
  "response": {
    "content": "¡Claro! A continuación tienes una selección de museos...",
    "additional_kwargs": {},
    "response_metadata": {},
    "type": "ai",
    "id": "0ed03fe5-b669-4f89-ba52-22d6b6828b89"
  },
  "actions": [],
  "places": []
}
```

**Problema:** El campo `response` es un **objeto** (AIMessage de LangChain) en lugar de un **string**.

---

## ✅ Solución Implementada en el Frontend

### 1. **Extracción Automática de Contenido**

**Archivo:** `src/screens/Chat/Chat.tsx`

**Función `extractCleanContent` (líneas 34-58):**

```typescript
const extractCleanContent = (content: any): string => {
  // Si ya es un string, devolverlo
  if (typeof content === 'string') {
    return content;
  }

  // Si es un objeto de LangChain con content
  if (content && typeof content === 'object') {
    // Intentar extraer el campo content
    if (content.content && typeof content.content === 'string') {
      console.log('✅ Extrayendo contenido de objeto LangChain');
      return content.content;
    }

    // Si es un error serializado como string
    if (content.message && typeof content.message === 'string') {
      return content.message;
    }
  }

  // Si nada funciona, convertir a string
  console.warn('⚠️ Contenido en formato inesperado, convirtiendo a string');
  return String(content);
};
```

**¿Qué hace?**
- Verifica si `content` es un string → lo devuelve directamente
- Si es un objeto con `.content` → extrae el texto
- Si es un error con `.message` → extrae el mensaje
- Si nada funciona → convierte a string

---

### 2. **Extracción en Respuestas HTTP**

**Archivo:** `src/screens/Chat/Chat.tsx` (líneas 280-285)

```typescript
// Extraer contenido limpio (por si el backend devuelve objeto LangChain)
let cleanResponse = response.response;
if (typeof response.response === 'object' && response.response.content) {
  console.log('⚠️ Backend devolvió objeto LangChain, extrayendo contenido...');
  cleanResponse = response.response.content;
}
```

**Resultado:**
- Si `response.response` es objeto → extrae `response.response.content`
- Si ya es string → lo usa directamente

---

### 3. **Extracción en Mensajes WebSocket**

**Archivo:** `src/screens/Chat/Chat.tsx` (líneas 190-195)

```typescript
// Extraer contenido limpio (por si el backend devuelve objeto LangChain)
let cleanResponse = data.response;
if (typeof data.response === 'object' && data.response.content) {
  console.log('⚠️ WebSocket: Backend devolvió objeto LangChain, extrayendo contenido...');
  cleanResponse = data.response.content;
}
```

**Resultado:**
- Maneja correctamente mensajes de WebSocket con objetos LangChain

---

### 4. **Uso en SafeMarkdown**

**Archivo:** `src/screens/Chat/Chat.tsx` (línea 65)

```typescript
// Limpiar el contenido primero
const cleanContent = extractCleanContent(content);
```

**Resultado:**
- Todo contenido pasa por `extractCleanContent` antes de renderizarse
- Se maneja automáticamente sin importar el formato

---

## 🐛 Problema del Backend (Requiere Fix)

### Ubicación del Problema:

**Backend:** `TAi_backend/app/api/routes/chat.py`

**Probablemente en:**
```python
@router.post("/message")
async def send_message(request: ChatRequest):
    # ...
    response = agent.invoke(...)  # Devuelve AIMessage

    # ❌ INCORRECTO: Devolver el objeto completo
    return ChatResponse(
        response=response,  # Esto es un AIMessage, no un string
        actions=[],
        places=[]
    )
```

### Solución en el Backend:

**Opción 1: Extraer .content del AIMessage**

```python
@router.post("/message")
async def send_message(request: ChatRequest):
    # ...
    response = agent.invoke(...)  # Devuelve AIMessage

    # ✅ CORRECTO: Extraer solo el contenido de texto
    response_text = response.content if hasattr(response, 'content') else str(response)

    return ChatResponse(
        response=response_text,  # Ahora es un string
        actions=[],
        places=[]
    )
```

**Opción 2: Usar .dict() y extraer content**

```python
@router.post("/message")
async def send_message(request: ChatRequest):
    # ...
    ai_message = agent.invoke(...)

    # Extraer solo el texto
    if isinstance(ai_message, AIMessage):
        response_text = ai_message.content
    else:
        response_text = str(ai_message)

    return ChatResponse(
        response=response_text,
        actions=[],
        places=[]
    )
```

**Opción 3: Actualizar el modelo de respuesta**

```python
# En app/models/chat.py
class ChatResponse(BaseModel):
    response: str  # ← Asegurar que sea str, no Any
    actions: List[ChatAction]
    places: List[Place]
```

---

## 🧪 Cómo Verificar si Está Funcionando

### Paso 1: Reinicia el Frontend

```bash
npm start
# Presiona 'r' para reload
```

### Paso 2: Envía un Mensaje al Chat

```
Usuario: "Recomiéndame museos en Santiago"
```

### Paso 3: Revisa los Logs de la Consola

**Si el backend sigue devolviendo objeto LangChain:**
```
⚠️ Backend devolvió objeto LangChain, extrayendo contenido...
✅ Extrayendo contenido de objeto LangChain
```

**Si el backend ya está arreglado:**
```
📦 Respuesta del chat: {response: "texto...", actions: [], places: []}
```

**No debería aparecer:**
```
❌ Error sending message: ...
Lo siento, hubo un error: Got unknown type content=...
```

---

## 📊 Comportamiento Actual vs Esperado

### ❌ Comportamiento Actual (con bug del backend):

```
Backend devuelve → Frontend recibe → Frontend extrae
{                   {                  "¡Claro! A continuación..."
  "response": {      "response": {
    "content":         "content":      ✅ Ahora funciona gracias
    "¡Claro!..."       "¡Claro!..."       al extractor
  }                  }
}                   }
```

### ✅ Comportamiento Esperado (backend arreglado):

```
Backend devuelve → Frontend recibe → Frontend usa directamente
{                   {                  "¡Claro! A continuación..."
  "response":         "response":
  "¡Claro!..."        "¡Claro!..."     ✅ Sin necesidad de extraer
}                   }
```

---

## 🎯 Logging Detallado

### Logs que Verás en la Consola:

#### Cuando funciona correctamente:
```
📦 Respuesta del chat: {response: "texto...", actions: [], places: []}
```

#### Cuando detecta objeto LangChain:
```
⚠️ Backend devolvió objeto LangChain, extrayendo contenido...
✅ Extrayendo contenido de objeto LangChain
```

#### Si hay tabla en el contenido:
```
📊 Detectada tabla en el mensaje, intentando renderizar...
```

#### Si hay error de renderizado:
```
⚠️ Error renderizando Markdown: [error] Contenido: [primeros 100 chars]
```

---

## 🔧 Recomendación: Arreglar el Backend

### Archivo a Modificar:

`C:\Users\josej\OneDrive\Documentos\TAi-joseesk\TAi-joseesk\src\backend\TAi_backend\app\api\routes\chat.py`

### Buscar:

```python
return ChatResponse(
    response=response,  # ← Probablemente aquí
    actions=actions,
    places=places
)
```

### Cambiar a:

```python
# Asegurar que response sea string
response_text = response.content if hasattr(response, 'content') else str(response)

return ChatResponse(
    response=response_text,  # ← Ahora es string
    actions=actions,
    places=places
)
```

### Verificar también WebSocket:

```python
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str):
    # ...
    ai_response = agent.invoke(...)

    # Asegurar que sea string
    response_text = ai_response.content if hasattr(ai_response, 'content') else str(ai_response)

    await websocket.send_json({
        "response": response_text,  # ← String, no objeto
        "actions": [],
        "places": []
    })
```

---

## ✅ Estado Actual

### Frontend:
- ✅ Extrae automáticamente contenido de objetos LangChain
- ✅ Maneja tanto HTTP como WebSocket
- ✅ Fallback a texto plano si hay error
- ✅ Logging detallado para debugging

### Backend:
- ⚠️ **Requiere fix:** Devolver `response.content` en lugar de `response`
- ⚠️ Verificar en HTTP endpoint (`/chat/message`)
- ⚠️ Verificar en WebSocket endpoint (`/chat/ws/...`)

---

## 📝 Archivos Modificados (Frontend)

1. ✅ `src/screens/Chat/Chat.tsx`
   - Líneas 34-58: Función `extractCleanContent`
   - Líneas 65: Uso en `SafeMarkdown`
   - Líneas 190-195: Extracción en WebSocket
   - Líneas 280-285: Extracción en HTTP
   - Líneas 288-320: Manejo de errores mejorado

---

## 🚀 Próximos Pasos

### Inmediato (Frontend):
- ✅ Implementado: Extracción automática de contenido
- ✅ Implementado: Manejo de errores mejorado
- ✅ Implementado: Logging detallado

### Recomendado (Backend):
1. 🔄 Arreglar endpoint `/chat/message`
2. 🔄 Arreglar endpoint WebSocket `/chat/ws/...`
3. 🔄 Agregar validación en modelo `ChatResponse`

### Beneficios de Arreglar el Backend:
- Menor tamaño de respuesta (menos datos transferidos)
- Más rápido (no necesita extracción)
- Más limpio (formato estándar)
- Mejor compatibilidad con otros clientes

---

## 📞 Verificación

**Para confirmar que el fix funciona:**

1. Reinicia el frontend
2. Envía un mensaje al chat
3. Verifica en consola:
   - ¿Ves "⚠️ Backend devolvió objeto LangChain"? → Backend aún no arreglado pero frontend maneja
   - ¿No ves ese mensaje? → Backend ya devuelve string correctamente
   - ¿Ves el contenido correctamente en el chat? → ✅ Fix funcionando

**Con el fix del frontend, el chat debería funcionar correctamente** aunque el backend aún no esté arreglado.

---

**Última actualización:** 2025-10-22
**Versión:** 2.6.0 (LangChain Object Extraction)
**Estado:** ✅ Frontend Arreglado | ⚠️ Backend Requiere Fix
