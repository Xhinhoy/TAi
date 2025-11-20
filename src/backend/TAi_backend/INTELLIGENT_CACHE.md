# 💾 Caché Inteligente para AI Agent

## 📋 Resumen

Sistema de **caché multi-capa** que reduce los costos del AI Agent entre **50-70%** mediante estrategias inteligentes de reutilización de análisis basados en:
- **GeoHash**: Agrupa ubicaciones cercanas (~150m)
- **Profile Hash**: Agrupa usuarios con intereses similares
- **TTL Dinámico**: Zonas populares = datos frescos, zonas tranquilas = mayor ahorro

---

## 🎯 Problema Resuelto

### **SIN Caché:**
```
Cada actualización de ubicación:
  1. Gemini busca en Google Places ($0.000017)
  2. Gemini consulta TripAdvisor ($0.000027)
  3. Gemini lee reviews ($0.000010)
  4. Gemini razona y genera alertas ($0.012)
  ────────────────────────────────────────
  Total: ~$0.012 por update

Usuario en sesión de 2h (120 updates):
  120 × $0.012 = $1.44 por sesión

100 usuarios activos/día (20% uso):
  20 × $1.44 = $28.80/día
  × 30 días = $864/mes 💸
```

### **CON Caché Inteligente:**
```
Primera vez en una zona:
  - Gemini genera análisis completo ($0.012)
  - Se guarda en caché con GeoHash + Profile Hash
  - TTL: 30 min - 6 horas según popularidad

Siguientes usuarios en misma zona con perfil similar:
  - Lee desde Firebase caché ($0.00001)
  - Ahorro: $0.01199 (~99.9% más barato)

Hit Rate esperado: 60-70%

Costo real con caché:
  40% misses: 48 × $0.012 = $0.576
  60% hits: 72 × $0.00001 = $0.00072
  ────────────────────────────────────────
  Total: ~$0.577 por sesión (60% ahorro ✅)

100 usuarios activos/día:
  20 × $0.577 = $11.54/día
  × 30 días = $346/mes

AHORRO: $864 - $346 = $518/mes (60%) 🎉
```

---

## 🏗️ Arquitectura

```
┌──────────────────────────────────────────────────────┐
│  USUARIO ACTUALIZA UBICACIÓN                         │
│  (lat: -33.4372, lng: -70.6506)                      │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
     ┌──────────────────────────────┐
     │  1. GENERAR CACHE KEY        │
     ├──────────────────────────────┤
     │  GeoHash (precisión 7)       │
     │  → "66hrxsj"  (~150m grid)   │
     │                              │
     │  Profile Hash                │
     │  → "a3f5d9c2" (intereses +   │
     │     presupuesto + estilo)    │
     │                              │
     │  Cache Key:                  │
     │  "ai_alerts_66hrxsj_a3f5d9c2"│
     └────────────┬─────────────────┘
                  │
                  ▼
     ┌────────────────────────────────┐
     │  2. BUSCAR EN CACHÉ            │
     └────────────┬───────────────────┘
                  │
         ┌────────┴────────┐
         │ ¿Existe?        │
         └────┬──────┬─────┘
              │      │
           SÍ │      │ NO
              ▼      ▼
      ┌─────────┐  ┌──────────────────┐
      │ CACHE   │  │ CACHE MISS       │
      │ HIT     │  │                  │
      │ ✅ 60%  │  │ ❌ 40%           │
      └───┬─────┘  └────┬─────────────┘
          │             │
          │             ▼
          │     ┌───────────────────┐
          │     │ 3. LLAMAR A GEMINI│
          │     │    (AI Agent)     │
          │     └───────┬───────────┘
          │             │
          │             ▼
          │     ┌───────────────────┐
          │     │ 4. CALCULAR TTL   │
          │     │    DINÁMICO       │
          │     ├───────────────────┤
          │     │ Zona popular:     │
          │     │ TTL = 30 min      │
          │     │                   │
          │     │ Zona normal:      │
          │     │ TTL = 2 horas     │
          │     │                   │
          │     │ Zona tranquila:   │
          │     │ TTL = 6 horas     │
          │     └───────┬───────────┘
          │             │
          │             ▼
          │     ┌───────────────────┐
          │     │ 5. GUARDAR EN     │
          │     │    CACHÉ          │
          │     └───────┬───────────┘
          │             │
          └─────────────┴──────────────┐
                        │              │
                        ▼              ▼
                ┌────────────────────────┐
                │  RETORNAR ALERTAS      │
                │  + metadata cache      │
                └────────────────────────┘
```

---

## 🔑 Sistema de Cache Keys

### **Componente 1: GeoHash**

**¿Qué es?**
- Codifica coordenadas GPS en un string corto
- Divide el mundo en cuadrículas jerárquicas
- Cuadrículas cercanas → GeoHash similar

**Precisión usada: 7** (~153m × 153m)

```python
# Ejemplos de encoding
GeoHash.encode(-33.4372, -70.6506, precision=7)
# → "66hrxsj"

GeoHash.encode(-33.4375, -70.6510, precision=7)  # 50m más allá
# → "66hrxsj"  (mismo hash!)

GeoHash.encode(-33.4400, -70.6550, precision=7)  # 200m más allá
# → "66hrxsk"  (diferente hash)
```

**Beneficio:**
- Usuarios a 100m comparten caché
- Reduce llamadas a Gemini sin perder precisión

### **Componente 2: Profile Hash**

**¿Qué factores se incluyen?**

```python
{
  "interests": ["gastronomía", "cultura"],  # Ordenados alfabéticamente
  "budget_range": "medium",  # Agrupado en rangos (low/medium/high/luxury)
  "travel_style": "cultural",
  "group_size": "pareja"
}

→ MD5 Hash → "a3f5d9c2"
```

**Agrupamiento de presupuestos:**
```python
Budget Range    | Min-Max       | Hash
----------------|---------------|----------
low             | $0 - $50      | "low"
medium          | $50 - $150    | "medium"
high            | $150 - $300   | "high"
luxury          | $300+         | "luxury"
```

**Ejemplos de perfiles que comparten hash:**

✅ **Mismo hash:**
```
Usuario A: {"interests": ["gastronomía", "cultura"], "budget": $80, "style": "cultural"}
Usuario B: {"interests": ["cultura", "gastronomía"], "budget": $120, "style": "cultural"}
→ Ambos: budget_range="medium", intereses iguales → Comparten caché ✅
```

❌ **Diferente hash:**
```
Usuario A: {"interests": ["gastronomía"], "budget": $80}
Usuario B: {"interests": ["aventura"], "budget": $85}
→ Intereses diferentes → Caché separado
```

### **Cache Key Final**

```
Format: "ai_alerts_{geohash}_{profile_hash}"

Ejemplo:
ai_alerts_66hrxsj_a3f5d9c2
```

---

## ⏱️ TTL Dinámico

**Estrategia:** Zonas más visitadas = datos más frescos

```python
class DynamicTTL:
    Zona muy popular (>50 hits):
        TTL = 1800 seg (30 minutos)
        Razón: Alta rotación, usuarios esperan info actualizada

    Zona popular (20-50 hits):
        TTL = 3600 seg (1 hora)
        Razón: Balance entre frescura y ahorro

    Zona normal (5-20 hits):
        TTL = 7200 seg (2 horas) ← DEFAULT
        Razón: Ahorro significativo sin perder calidad

    Zona tranquila (<5 hits):
        TTL = 21600 seg (6 horas)
        Razón: Máximo ahorro, datos estables
```

**Tracking de popularidad:**

```python
DynamicTTL._zone_hits = {
    "66hrxsj": 127,  # Centro Santiago (muy popular)
    "66hrxsk": 45,   # Providencia (popular)
    "66hrxmn": 12,   # Ñuñoa (normal)
    "66hsz12": 2     # Periferia (tranquila)
}
```

**Ajuste automático:**
- Cada vez que un usuario visita una zona → `record_zone_hit(geohash)`
- TTL se recalcula automáticamente basado en hits acumulados
- Se resetea periódicamente (ej: cada mes)

---

## 📊 Métricas y Monitoreo

### **Endpoint: GET /api/v1/cache/stats**

```json
{
  "cache_stats": {
    "hits": 1834,
    "misses": 842,
    "hit_rate": "68.5%",
    "ai_calls_saved": 1834,
    "cost_saved_usd": "$22.01"
  },
  "zone_stats": {
    "total_zones": 47,
    "total_hits": 2676,
    "top_zones": [
      {"geohash": "66hrxsj", "hits": 127},
      {"geohash": "66hrxsk", "hits": 89},
      {"geohash": "66hrxmn", "hits": 65}
    ]
  }
}
```

**Interpretación:**
- **Hit rate 68.5%**: De cada 100 requests, 68 vienen de caché
- **AI calls saved: 1834**: Gemini NO fue llamado 1834 veces
- **Cost saved: $22.01**: Ahorro acumulado (1834 × $0.012)
- **Top zones**: Centro Santiago es la zona más visitada

---

## 🔄 Invalidación de Caché

### **Estrategias de Invalidación**

#### **1. TTL Automático** (Principal)
```
Cache entry expires → Próxima request regenera
```

#### **2. Invalidación Manual por Zona**
```bash
DELETE /api/v1/cache/clear/zone/{geohash}
```

**Casos de uso:**
- Nuevo restaurant popular abre en la zona
- Evento especial (festival, feria)
- Cambio drástico de ratings

#### **3. Limpieza Completa**
```bash
DELETE /api/v1/cache/clear/ai-alerts
```

**PRECAUCIÓN:** Forzará Gemini en todas las ubicaciones

#### **4. Limpieza de Expirados** (Scheduled job)
```python
# Ejecutar diariamente
firebase_cache.clean_expired("ai_agent_alerts")
```

### **Invalidación Inteligente (Futuro)**

Invalidar automáticamente cuando:
- Review nueva con rating muy diferente al promedio
- Lugar cerró permanentemente
- Horarios cambiaron
- Rating de Google cambió ±0.5

---

## 🧪 Testing del Caché

### **Escenario 1: Primera Visita a Zona**

```bash
# Usuario 1 en Centro Santiago
POST /api/v1/exploration/location/update
{
  "latitude": -33.4372,
  "longitude": -70.6506
}

Response:
{
  "alerts": [...],
  "cache_hit": false,
  "from_cache": false
}

Logs:
❌ CACHE MISS. Generando con Gemini...
🔧 Ejecutando tool: google_places_search
🔧 Ejecutando tool: tripadvisor_reviews
✅ Agent generó 3 alertas
💾 Resultado guardado en caché (TTL: 7200s)
```

### **Escenario 2: Usuario Similar en Misma Zona**

```bash
# Usuario 2 (perfil similar) a 100m del Usuario 1
POST /api/v1/exploration/location/update
{
  "latitude": -33.4380,  # 100m más allá
  "longitude": -70.6510
}

Response:
{
  "alerts": [...],
  "cache_hit": true,
  "from_cache": true,
  "cached_at": "2025-01-10T15:23:45"
}

Logs:
🔑 Cache key: ai_alerts_66hrxsj_a3f5d9c2
✅ CACHE HIT! Reutilizando análisis previo
💰 Ahorro: $0.012
```

### **Escenario 3: Usuario con Perfil Diferente**

```bash
# Usuario 3 (intereses diferentes) en misma zona
# Intereses: ["aventura", "deportes"] vs ["gastronomía", "cultura"]

Response:
{
  "cache_hit": false
}

Logs:
🔑 Cache key: ai_alerts_66hrxsj_f8c2b1a4  # ← Profile hash diferente
❌ CACHE MISS. Generando con Gemini...
```

---

## 📈 Optimizaciones Adicionales

### **1. Cache Warming** (Precalentamiento)

Generar caché proactivamente para zonas turísticas populares:

```python
# Ejecutar durante la noche (bajo tráfico)
popular_zones = [
    {"lat": -33.4372, "lng": -70.6506},  # Centro Santiago
    {"lat": -33.4256, "lng": -70.6344},  # Providencia
    {"lat": -33.4400, "lng": -70.6550}   # Bellavista
]

for zone in popular_zones:
    for profile in common_profiles:
        agent.generate_alerts(zone['lat'], zone['lng'], profile, use_cache=True)
```

**Beneficio:**
- Usuarios en horas peak encuentran caché ya generado
- Hit rate inicial: 80-90% en zonas pre-calentadas

### **2. Cache Expansion** (Vecinos)

Si no hay hit en zona exacta, buscar en zonas vecinas:

```python
geohash = "66hrxsj"
neighbors = GeoHashUtil.neighbors(geohash)
# → ["66hrxsk", "66hrxsm", "66hrxsp", ...]

for neighbor in neighbors:
    cache_key = f"ai_alerts_{neighbor}_{profile_hash}"
    if cache_exists(cache_key):
        return cached_data  # Con leve ajuste de distancias
```

**Beneficio:**
- Aumenta hit rate 10-15%
- Lugares interesantes están en zonas adyacentes

### **3. Compression**

Comprimir resultados antes de guardar en Firebase:

```python
import gzip
import base64

# Guardar
compressed = gzip.compress(json.dumps(result).encode())
encoded = base64.b64encode(compressed).decode()
firebase_cache.set(prefix, key, encoded, ttl)

# Leer
decoded = base64.b64decode(cached_data.encode())
decompressed = gzip.decompress(decoded)
result = json.loads(decompressed)
```

**Beneficio:**
- Reduce tamaño de caché 60-70%
- Reduce costos de Firebase storage/bandwidth

---

## 🔧 Configuración

### **Variables de Entorno** (`.env`)

```env
# Caché Inteligente
CACHE_ENABLED=True
CACHE_DEFAULT_TTL=7200  # 2 horas
GEOHASH_PRECISION=7     # ~150m
CACHE_WARMING_ENABLED=False
```

### **Configuración en Código**

```python
# app/services/llm/alert_agent.py

# Habilitar/deshabilitar caché
agent.generate_alerts(..., use_cache=True)  # Default

# Forzar regeneración
agent.generate_alerts(..., use_cache=False)
```

---

## 📊 Proyecciones de Ahorro

### **Escenario Real: 1000 usuarios/mes**

**Distribución de uso:**
- 10% usuarios muy activos (10 sesiones/mes) = 100 usuarios
- 30% usuarios activos (3 sesiones/mes) = 300 usuarios
- 60% usuarios ocasionales (1 sesión/mes) = 600 usuarios

**Total sesiones/mes:**
- 100 × 10 = 1000 sesiones
- 300 × 3 = 900 sesiones
- 600 × 1 = 600 sesiones
- **Total: 2500 sesiones/mes**

**Costo promedio por sesión:**
- Sin caché: $1.44 × 2500 = **$3,600/mes** ❌
- Con caché (60% hit rate): $0.577 × 2500 = **$1,442/mes** ✅

**AHORRO MENSUAL: $2,158 (60%)** 🎉

**Ahorro anual: $25,896**

---

## 🎯 Métricas de Éxito

### **Objetivos**

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| Hit Rate | >60% | Medir |
| TTL Promedio | 2-4 horas | Medir |
| Costo/sesión | <$0.70 | Medir |
| Latencia caché | <100ms | Medir |
| Latencia Gemini | <2000ms | Medir |

### **Dashboard de Monitoreo**

```
GET /api/v1/cache/stats

Visualización recomendada:
┌──────────────────────────────────────┐
│ CACHE PERFORMANCE                    │
├──────────────────────────────────────┤
│ Hit Rate:  ████████░░  68.5%         │
│ Calls Saved: 1,834                   │
│ Cost Saved:  $22.01                  │
│                                      │
│ TOP ZONES                            │
│ 1. Centro (66hrxsj)      127 hits    │
│ 2. Providencia (66hrxsk)  89 hits    │
│ 3. Ñuñoa (66hrxmn)        65 hits    │
└──────────────────────────────────────┘
```

---

## 🚀 Roadmap de Mejoras

### **Fase 3: Optimizaciones Avanzadas**
- [ ] Cache warming de zonas populares
- [ ] Cache expansion a vecinos
- [ ] Compression de resultados
- [ ] Predicción de zonas hot (ML)

### **Fase 4: Invalidación Inteligente**
- [ ] Detectar cambios de rating automáticamente
- [ ] Integrar con webhooks de Google Places
- [ ] Invalidación basada en eventos (festivales, etc.)

---

**Versión:** 1.0.0
**Fecha:** 2025-01-10
**Estado:** ✅ Caché Inteligente Implementado
**Ahorro Estimado:** 50-70%
