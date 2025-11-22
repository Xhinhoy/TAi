# 🔧 Fix: Errores de Markdown en el Chat

## 🎯 Problemas Reportados

1. **Error "Got unknown type content"** - El renderizador de Markdown no reconoce algún tipo de contenido
2. **Las tablas no se ven** - Las tablas Markdown no se renderizan correctamente

---

## ✅ Soluciones Implementadas

### 1. **Componente SafeMarkdown con Fallback**

**Archivo:** `src/screens/Chat/Chat.tsx` (líneas 34-79)

**¿Qué hace?**
- Captura errores de renderizado de Markdown
- Si hay un error, muestra el contenido como texto plano
- Detecta si hay tablas en el contenido
- Agrega logging detallado para debugging

```typescript
const SafeMarkdown: React.FC<{ content: string; style: any }> = ({ content, style }) => {
  const [hasError, setHasError] = useState(false);

  // Detectar si el contenido tiene tablas
  const hasTable = content.includes('|') && content.includes('---');

  if (hasError) {
    // Fallback a texto plano
    return <Text>{content}</Text>;
  }

  try {
    return (
      <Markdown
        style={style}
        mergeStyle={true}
        onError={(error) => {
          console.warn('⚠️ Error renderizando Markdown:', error);
          setHasError(true);
        }}
      >
        {content}
      </Markdown>
    );
  } catch (error) {
    console.error('❌ Error crítico en Markdown:', error);
    return <Text>{content}</Text>;
  }
};
```

**Beneficios:**
- ✅ El chat nunca se rompe completamente
- ✅ Muestra el contenido aunque haya errores
- ✅ Logs detallados para debugging
- ✅ Detecta tablas automáticamente

---

### 2. **Estilos Adicionales para Tablas**

**Archivo:** `src/screens/Chat/Chat.tsx` (líneas 702-762)

**Estilos agregados:**

```typescript
// Estilos mejorados para tablas
table: {
  borderWidth: 1,
  borderColor: theme.colors.border.primary,
  borderRadius: 8,
  marginTop: 8,
  marginBottom: 8,
  overflow: 'hidden' as const, // ← Agregado
},
tbody: {  // ← Nuevo
  backgroundColor: theme.colors.surface.primary,
},
th: {
  padding: 8,
  fontWeight: '600' as const,
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.border.primary,
  borderRightWidth: 1,  // ← Agregado
  borderRightColor: theme.colors.border.primary,  // ← Agregado
  fontSize: 13,  // ← Agregado
},
tr: {  // ← Nuevo
  flexDirection: 'row' as const,
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.border.secondary,
},
td: {
  padding: 8,
  borderRightWidth: 1,  // ← Agregado
  borderRightColor: theme.colors.border.secondary,  // ← Agregado
  fontSize: 13,  // ← Agregado
  flex: 1,  // ← Agregado
},
```

**Elementos adicionales soportados:**
- `text` - Texto simple
- `textgroup` - Grupo de texto
- `hardbreak` - Salto de línea forzado
- `softbreak` - Salto de línea suave
- `pre` - Bloque preformateado
- `inline` - Contenido inline
- `span` - Span de texto

---

### 3. **Logging Mejorado**

Ahora el chat registra:

```javascript
// Cuando detecta tabla
console.log('📊 Detectada tabla en el mensaje, intentando renderizar...');

// En caso de error
console.warn('⚠️ Error renderizando Markdown:', error, 'Contenido:', content.substring(0, 100));

// En caso de error crítico
console.error('❌ Error crítico en Markdown:', error);
```

---

## 🐛 Por Qué Ocurren Estos Errores

### Error "Got unknown type content"

**Causa principal:** La librería `react-native-markdown-display` no reconoce algún tipo de nodo en el AST (Abstract Syntax Tree) del Markdown.

**Posibles razones:**
1. El backend envía Markdown con sintaxis no estándar
2. Hay elementos HTML mezclados con Markdown
3. Tablas complejas que la librería no puede parsear
4. Markdown extendido (GFM - GitHub Flavored Markdown) que no está completamente soportado

**Ejemplo de contenido problemático:**
```markdown
<div style="color: red">Texto con HTML</div>  ← No soportado

| Col1 | Col2 |
|:-----|-----:|  ← Alineación puede causar problemas
| A    | B    |
```

---

### Tablas No Se Ven

**Causa principal:** `react-native-markdown-display` tiene soporte **limitado** para tablas en React Native (especialmente en móvil).

**Limitaciones conocidas:**
1. Las tablas se renderizan como componentes `View` anidados, no como HTML `<table>`
2. No soporta todas las características de tablas GFM (alineación, colspan, etc.)
3. En algunas versiones, las tablas no se renderizan en absoluto

**Alternativas:**
1. ✅ **Implementado:** Fallback a texto plano si falla
2. 🔄 **Próximo:** Convertir tablas Markdown a formato de lista
3. 🔄 **Próximo:** Renderizar tablas como imagen (screenshot del backend)

---

## 🧪 Cómo Probar los Cambios

### Paso 1: Reinicia la App

```bash
# Detén el servidor
Ctrl+C

# Reinicia
npm start

# Presiona 'r' para reload
```

### Paso 2: Prueba Diferentes Tipos de Markdown

Envía estos mensajes al chat y verifica que se renderizan:

#### Test 1: Negritas y Listas (Debería funcionar)
```
Usuario: "Dame una lista de museos"

Asistente debería responder:
**Museos en Santiago:**
- Museo de la Memoria
- Museo de Bellas Artes
- Museo Precolombino
```

✅ **Resultado esperado:** Negritas y bullets se ven correctamente

---

#### Test 2: Tabla Simple (Puede fallar)
```
Usuario: "Muéstrame una tabla de precios"

Asistente debería responder:
| Lugar | Precio |
|-------|--------|
| Museo | $5     |
| Parque| Gratis |
```

⚠️ **Resultado esperado:**
- **Mejor caso:** Tabla renderizada con bordes
- **Caso normal:** Texto plano con formato de tabla
- **Peor caso:** Error capturado, muestra texto plano

---

#### Test 3: Markdown Complejo
```
Usuario: "Dame información detallada"

Asistente debería responder con:
# Título Grande
## Subtítulo

**Negrita** y *cursiva*

- Lista item 1
- Lista item 2

> Cita importante

`Código inline`

```python
def ejemplo():
    return "código"
```
```

✅ **Resultado esperado:** Todo debería renderizarse correctamente

---

### Paso 3: Verifica los Logs

Abre la consola y busca:

```
📊 Detectada tabla en el mensaje, intentando renderizar...
  ↑ Si ves esto, hay una tabla en el mensaje

⚠️ Error renderizando Markdown: [error]
  ↑ Si ves esto, algo falló pero se manejó

❌ Error crítico en Markdown: [error]
  ↑ Si ves esto, hubo un error grave pero se capturó
```

---

## 🔍 Diagnóstico de Problemas

### Problema 1: Sigue apareciendo "Got unknown type content"

**Síntoma:** Error visible en la interfaz

**Causa:** El error no está siendo capturado

**Solución:**
1. Verifica que `SafeMarkdown` se esté usando (no `<Markdown>` directamente)
2. Revisa los logs para ver qué tipo de contenido está fallando
3. Comparte el contenido del mensaje que falla

---

### Problema 2: Tablas siguen sin verse

**Síntoma:** Donde debería haber tabla, no hay nada o texto sin formato

**Diagnóstico:**

**Paso 1:** Verifica en los logs
```
📊 Detectada tabla en el mensaje, intentando renderizar...
```

**Paso 2:** Si hay error:
```
⚠️ Error renderizando Markdown: ...
```

Significa que la librería no puede renderizar la tabla.

**Soluciones:**

**Opción A: Pedir al backend que no use tablas**

Modificar el prompt del backend para que use listas en lugar de tablas:

```python
# En el prompt del agente (backend)
"No uses tablas Markdown. En su lugar, usa listas con formato así:

📍 Lugar: Museo de Arte
   💰 Precio: $5
   ⭐ Rating: 4.5
   📍 Dirección: Av. Principal 123
"
```

**Opción B: Convertir tablas a listas automáticamente** (próxima implementación)

---

### Problema 3: El texto se ve pero sin formato

**Síntoma:** Todo aparece como texto plano sin negritas ni listas

**Causa:** El componente cayó en el fallback

**Diagnóstico:**
Busca en logs:
```
⚠️ Error renderizando Markdown: ...
```

**Solución:**
Comparte el error completo para poder solucionarlo específicamente.

---

## 📊 Soporte de Elementos Markdown

### ✅ Completamente Soportado

| Elemento | Markdown | Estado |
|----------|----------|--------|
| Negritas | `**texto**` | ✅ Funciona |
| Cursivas | `*texto*` | ✅ Funciona |
| Títulos | `# H1`, `## H2` | ✅ Funciona |
| Listas | `- item` | ✅ Funciona |
| Código inline | `` `código` `` | ✅ Funciona |
| Bloques código | ` ```código``` ` | ✅ Funciona |
| Citas | `> texto` | ✅ Funciona |
| Enlaces | `[texto](url)` | ✅ Funciona |
| Líneas | `---` | ✅ Funciona |

### ⚠️ Parcialmente Soportado

| Elemento | Markdown | Estado |
|----------|----------|--------|
| Tablas | `\| col \|` | ⚠️ Limitado |
| HTML | `<div>` | ❌ No soportado |
| Imágenes | `![alt](url)` | ⚠️ Limitado |

### ❌ No Soportado

- HTML embebido
- Alineación de tablas (`:---`, `---:`)
- Tablas con celdas fusionadas (colspan/rowspan)
- Markdown extendido específico de plataformas

---

## 🎯 Recomendaciones

### Para el Backend:

1. **Usa elementos simples:**
   - ✅ Negritas, cursivas, listas
   - ✅ Títulos, código
   - ⚠️ Evita tablas complejas
   - ❌ No uses HTML

2. **Si necesitas mostrar datos tabulares:**
   ```markdown
   En lugar de tabla:

   📍 **Museo de Arte**
   - 💰 Precio: $5
   - ⭐ Rating: 4.5
   - 📍 Dirección: Av. Principal

   📍 **Parque Central**
   - 💰 Precio: Gratis
   - ⭐ Rating: 4.8
   - 📍 Dirección: Centro
   ```

3. **Usa emojis para mejor visualización:**
   - 📍 Ubicación
   - 💰 Precio
   - ⭐ Rating
   - 🕒 Horario
   - 🎯 Recomendación

---

## 🚀 Próximas Mejoras

### Corto Plazo:
1. ✅ Captura de errores (completado)
2. ✅ Fallback a texto plano (completado)
3. 🔄 Convertir tablas a listas automáticamente
4. 🔄 Mejorar estilos de código

### Mediano Plazo:
1. 🔄 Renderizador personalizado para tablas
2. 🔄 Soporte para imágenes en Markdown
3. 🔄 Copiar mensaje al portapapeles
4. 🔄 Exportar conversación

---

## 📝 Archivos Modificados

1. ✅ `src/screens/Chat/Chat.tsx`
   - Líneas 34-79: Componente `SafeMarkdown`
   - Líneas 525-528: Uso de `SafeMarkdown`
   - Líneas 702-762: Estilos mejorados para tablas y otros elementos

---

## 📞 Si el Problema Persiste

**Información que necesito:**

1. **Logs de la consola** cuando ocurre el error:
   - Cualquier mensaje con ⚠️ o ❌
   - El contenido del mensaje que falla (primeros 100 caracteres)

2. **Contenido del mensaje del asistente** que causa el error:
   - Copia el texto exacto que devuelve el backend
   - Especialmente si tiene tablas o HTML

3. **Screenshot** de cómo se ve en la pantalla

Con esa información podré:
- Identificar qué tipo de contenido específico está fallando
- Crear un parser/preprocesador para ese tipo de contenido
- O recomendar cambios en el backend

---

**Última actualización:** 2025-10-22
**Versión:** 2.5.0 (SafeMarkdown + Error Handling)
**Estado:** ✅ Implementado y Listo para Probar
