# TAi – Generador Inteligente de Itinerarios Turísticos

![Status](https://img.shields.io/badge/status-en%20desarrollo-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-React%20Native%20%7C%20FastAPI%20%7C%20Firebase-green)

**TAi** es un proyecto académico (Capstone 2025 – Ingeniería en Informática, DUOC UC) que genera **itinerarios turísticos personalizados** mediante IA ligera (Groq/llama-3.x) e integra **APIs externas** (Google Places, TripAdvisor).

---

## Requisitos

- **Node.js** 18+ y **npm** 9+
- **Python** 3.11+ y **pip**
- **Git**
- **Expo CLI** (se instala con npm)
- Opcional: **make** o **just** para orquestación

---

## Instalación (desarrollo local)

### 1. Clonar repositorio

```bash
git clone https://github.com/tu-org/TAi.git
cd TAi
```

### 2. Configurar variables de entorno

#### Frontend
```bash
cd src/frontend
cp .env.example .env
# Editar .env con valores reales o dejar mock
```

#### Backend
```bash
cd src/backend
cp .env.example .env
# Editar .env: dejar MOCK_MODE=true para desarrollo sin APIs externas
```

### 3. Instalar dependencias

```bash
# Frontend
cd src/frontend && npm install

# Backend (crear venv recomendado)
cd src/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## Levantar proyecto (un solo comando)

### Opción A: Scripts cross-platform

#### Windows (PowerShell)
```powershell
.\scripts\dev.ps1
```

#### Linux/Mac
```bash
bash scripts/dev.sh
```

### Opción B: Makefile
```bash
make setup    # Primera vez (instala deps)
make dev      # Levanta frontend + backend
```

### Opción C: Justfile
```bash
just setup
just dev
```

### Opción D: Manual
```bash
# Terminal 1: Backend
cd src/backend/TAi_backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd src/frontend
npm run dev
```

---

## Endpoints locales

- **Backend (FastAPI):** http://localhost:8000
  - Docs interactivos: http://localhost:8000/docs
  - Health check: http://localhost:8000/health
- **Frontend (Expo):** http://localhost:8081
  - Metro bundler: http://localhost:8081
  - Web: http://localhost:19006

---

## Variables de entorno clave

### Frontend (`.env`)
```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
EXPO_PUBLIC_MOCK_MODE=true  # Activa mocks locales
```

### Backend (`.env`)
```env
MOCK_MODE=true              # No llama APIs externas reales
PORT=8000
DEBUG=true
CORS_ORIGINS=http://localhost:8081,http://localhost:19006
```

---

## Modo Mock (sin APIs externas)

Por defecto, `MOCK_MODE=true` activa:
- **Firebase:** Simulado (no requiere credenciales reales)
- **Groq LLM:** Respuestas estáticas locales
- **Google Places / TripAdvisor:** Datos de `src/backend/TAi_backend/mocks/*.json`

Para producción, desactivar mock y configurar claves reales.

---

## Scripts disponibles

### Frontend
```bash
npm run dev       # Levanta Expo dev server
npm run lint      # ESLint + fix
npm run format    # Prettier
npm test          # Jest
```

### Backend
```bash
uvicorn app.main:app --reload   # Dev server
pytest                          # Tests
black . && ruff check .         # Linters
```

---

## Estructura del proyecto

```
TAi/
├── src/
│   ├── frontend/          # React Native (Expo)
│   │   ├── app/           # Screens
│   │   ├── components/
│   │   └── .env
│   ├── backend/           # FastAPI
│   │   └── TAi_backend/
│   │       ├── app/       # API, servicios, modelos
│   │       ├── mocks/     # Datos mock locales
│   │       └── .env
│   └── database/          # Repositorios Firebase (TypeScript)
├── scripts/
│   ├── dev.ps1            # Windows
│   └── dev.sh             # Linux/Mac
├── Makefile
├── justfile
└── README.md
```

---

## Troubleshooting

### Backend no inicia
- Verificar que `uvicorn` esté instalado: `pip install uvicorn[standard]`
- Revisar logs: `uvicorn app.main:app --log-level debug`

### Frontend no conecta al backend
- Verificar `EXPO_PUBLIC_API_URL` en `.env`
- Comprobar CORS en backend (puerto 8081/19006 permitido)

### Error de Firebase
- Si `MOCK_MODE=false`, verificar ruta del archivo de credenciales en `FIREBASE_CREDENTIALS_PATH`
- En mock, ignorar warnings de Firebase

### Puerto 8000/8081 ocupado
- Cambiar `PORT` en backend `.env`
- Expo: usar `--port` flag

---

## Tecnologías

- **Frontend:** React Native, TypeScript, Expo, React Query, Zustand
- **Backend:** FastAPI, Pydantic, LangChain, Groq (llama-3.x)
- **Base de Datos:** Firebase Firestore (con mock local)
- **APIs:** Google Places, TripAdvisor (con mock local)
- **DX:** Make, Just, ESLint, Prettier, Black, Ruff

---

## Equipo

- Nicolás Sabando
- José Eskenazi
- Nicolás Soto

---

## Licencia

MIT – Proyecto académico Capstone 2025, DUOC UC
