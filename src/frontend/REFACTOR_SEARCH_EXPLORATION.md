# Refactorización: Pantalla de Búsqueda → Exploración

## Cambios Realizados

### 1. **Unificación de la pantalla de búsqueda**
- **Antes**: La pestaña tenía 2 modos separados (Búsqueda IA + Exploración) con botones para alternar
- **Ahora**: Solo modo de Exploración, todo en una sola pantalla sin necesidad de cambiar modos

### 2. **Archivos eliminados**

#### Componentes obsoletos:
- `src/screens/Search/SearchExploration.tsx` → Movido a `Search.tsx`
- `src/components/search/SearchBar.tsx` → Ya no se necesita
- `src/components/search/ResultsList.tsx` → Ya no se necesita
- `src/components/search/MapContainer.tsx` → Reemplazado por `ExplorationMap`
- `src/components/search/MapContainer.css` → Ya no se necesita

### 3. **Archivo modificado**

#### `src/screens/Search/Search.tsx`
**Cambios principales:**
- Eliminado todo el código de búsqueda con IA (performSearch, recommendations, etc.)
- Eliminados imports de componentes obsoletos:
  - `SearchBar`
  - `ResultsList`
  - `MapContainer`
  - `recommendationsService`
  - `usePreferences` (ya no se usa aquí)
- Removido estado para alternar entre modos (`mode: 'search' | 'exploration'`)
- Simplificado a un solo flujo de exploración en tiempo real

**Funcionalidad conservada:**
- Todo el sistema de exploración con WebSocket
- Hooks de ubicación y sesión
- Componentes de UI (AlertsCarousel, SessionStatusBar, etc.)
- Mapa con marcadores de alertas
- Sistema de interacciones (tap, save, dismiss)

### 4. **Estructura actual de Search.tsx**

```
Search (Componente Principal)
│
├── Estado de sesión (useExplorationSession)
│   ├── isActive, isPaused
│   ├── alerts (lugares cercanos)
│   ├── sessionInfo (tiempo, distancia, etc.)
│   └── Acciones (start, end, pause, etc.)
│
├── Estado de ubicación (useLocationTracking)
│   ├── location (lat, lng)
│   ├── hasPermission
│   └── Tracking GPS continuo
│
└── Componentes UI
    ├── SessionStatusBar (cuando hay sesión activa)
    ├── ExplorationMap (mapa con alertas)
    ├── AlertsCarousel (tarjetas de lugares)
    ├── ExplorationControls (botones)
    ├── SessionSummaryModal (resumen final)
    └── Indicador de tracking
```

### 5. **UX mejorado**

#### Antes:
1. Usuario entra a la pestaña → Ve búsqueda con IA
2. Usuario debe presionar botón "Modo Exploración"
3. Cambia a otra pantalla completamente
4. Al finalizar, vuelve a búsqueda IA

#### Ahora:
1. Usuario entra a la pestaña → Ve directamente el mapa
2. Botón grande "Iniciar Exploración" en el centro
3. Todo sucede en la misma pantalla
4. Experiencia más fluida y directa

### 6. **Componentes que se mantienen**

Estos componentes siguen funcionando normalmente:
- `src/screens/Search/components/ExplorationMap.tsx` (nativo)
- `src/screens/Search/components/ExplorationMap.web.tsx` (web)
- `src/screens/Search/components/AlertsCarousel.tsx`
- `src/screens/Search/components/SessionStatusBar.tsx`
- `src/screens/Search/components/ExplorationControls.tsx`
- `src/screens/Search/components/PlaceAlertCard.tsx`
- `src/screens/Search/components/SessionSummaryModal.tsx`

### 7. **Servicios backend**

#### Servicios eliminados del frontend:
- Ninguno (se mantienen todos por si se necesitan en el futuro)

#### Servicios activos utilizados:
- `explorationService` → Gestión de sesiones
- `explorationWS` → WebSocket en tiempo real
- `locationService` → GPS y permisos

### 8. **Flujo de usuario final**

```
1. Usuario abre pestaña "Buscar"
   ↓
2. Ve mapa con su ubicación
   ↓
3. Presiona "Iniciar Exploración"
   ↓
4. Se solicitan permisos de ubicación
   ↓
5. Empieza a caminar
   ↓
6. Recibe alertas de lugares cercanos en tiempo real
   ↓
7. Puede pausar/reanudar/finalizar en cualquier momento
   ↓
8. Al finalizar, ve resumen de la sesión
   ↓
9. Puede iniciar nueva sesión desde el modal
```

## Beneficios de la refactorización

1. **Simplicidad**: Una sola pantalla, un solo propósito
2. **Mejor UX**: Sin cambios de contexto confusos
3. **Menos código**: ~360 líneas vs ~490 líneas anteriores
4. **Mantenibilidad**: Más fácil de entender y modificar
5. **Performance**: Menos componentes montados/desmontados

## Notas importantes

- El servicio `recommendationsService` se mantiene en `services.ts` por si se necesita en otras pantallas
- El contexto `PreferencesContext` sigue siendo usado por Home, Profile y Chat
- Los archivos de documentación `.md` se mantienen como referencia histórica
