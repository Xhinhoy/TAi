# TAi Backend

API RESTful para generación inteligente de itinerarios turísticos personalizados.

## Stack

- **Framework:** FastAPI
- **LLM:** Groq (Llama 3.1 70B)
- **Database:** Firebase (Firestore + Realtime DB)
- **Auth:** Firebase Authentication
- **External APIs:** Google Places

## Instalación

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

## Configuración

Archivo `.env` requerido:

```env
FIREBASE_CREDENTIALS_PATH=path/to/credentials.json
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
GROQ_API_KEY=your_groq_api_key
GOOGLE_PLACES_API_KEY=your_google_api_key
```

## Ejecución

```bash
# Desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Producción
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Estructura

```
app/
├── api/
│   ├── deps.py              # Dependencias (auth)
│   └── v1/
│       ├── router.py        # Router principal
│       ├── users.py         # Endpoints usuarios
│       ├── places.py        # Endpoints lugares
│       ├── recommendations.py
│       ├── itineraries.py
│       ├── chat.py
│       └── cache.py
├── core/
│   ├── config.py            # Configuración
│   ├── firebase.py          # Firebase client
│   └── security.py          # Autenticación
├── models/                  # Schemas Pydantic
├── repositories/            # Acceso a datos
├── services/                # Lógica de negocio
│   ├── external/            # APIs externas
│   └── llm/                 # Agente IA
└── main.py                  # Entrypoint
```

## Endpoints

Base URL: `/api/v1`

### Autenticación
Todos los endpoints requieren token Firebase JWT:
```
Authorization: Bearer <token>
```

### Principales
- `GET /health` - Health check
- `GET /users/{uid}/profile` - Obtener perfil
- `GET /places/search` - Buscar lugares
- `POST /recommendations/generate` - Generar recomendaciones
- `POST /itineraries/generate` - Generar itinerario
- `POST /chat/message` - Chat con agente
- `WS /chat/ws/{user_id}/{session_id}` - WebSocket chat

Ver documentación completa: `API_DOCUMENTATION.md`

## Documentación Interactiva

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

```bash
# Ejecutar tests (cuando estén implementados)
pytest

# Con cobertura
pytest --cov=app tests/
```

## Optimizaciones Aplicadas

1. **Distancia Haversine** en optimización de rutas
2. **Validaciones Pydantic** en todos los modelos
3. **Sistema de caché** para APIs externas
4. **Rate limiting** en Google Places
5. **Memoria limitada** en agente conversacional
6. **Type hints** completos

## Bugs Corregidos

- ✅ Instanciación de `GooglePlacesFacade` en tools
- ✅ Import `GetReviewsTool` eliminado
- ✅ Return statement faltante en `get_place_details`
- ✅ Validación de coordenadas GPS
- ✅ Límite de memoria en conversaciones

## Pendientes

- [ ] Tests unitarios e integración
- [ ] Rate limiting global (FastAPI Limiter)
- [ ] Retry logic para APIs externas
- [ ] Health checks detallados
- [ ] WebSocket authentication
- [ ] Dockerización
- [ ] CI/CD pipeline

## Seguridad

- ✅ Tokens JWT verificados
- ✅ CORS configurado
- ✅ Variables sensibles en `.env`
- ⚠️ Falta rate limiting global
- ⚠️ Falta sanitización de inputs LLM

## Performance

- Caché Firebase: 12h (búsquedas), 24h (detalles)
- Rate limit Google Places: 50 req/min
- Max tokens LLM: 2000
- Memoria conversación: 50 mensajes

## Contacto

Proyecto académico - Capstone 2025 DUOC UC
