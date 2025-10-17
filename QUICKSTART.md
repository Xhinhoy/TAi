# TAi - Quick Start

## Setup Inicial (solo primera vez)

### PowerShell (Windows)

```powershell
# Backend
cd C:\ProyectosTrabajo\TAi\src\backend\TAi_backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend
cd C:\ProyectosTrabajo\TAi\src\frontend
npm install
```

### Bash (Linux/macOS/WSL)

```bash
# Backend
cd src/backend/TAi_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../../frontend
npm install
```

---

## Correr Proyecto

### PowerShell (Windows) - Recomendado

```powershell
# Terminal 1: Backend
cd C:\ProyectosTrabajo\TAi\src\backend\TAi_backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd C:\ProyectosTrabajo\TAi\src\frontend
npm run web
```

### Bash

```bash
# Terminal 1: Backend
cd src/backend/TAi_backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd ../../frontend
npm run web
```

### Orquestación Automática

```powershell
# PowerShell (abre 2 ventanas nuevas)
.\scripts\dev.ps1
```

```bash
# Bash (modo paralelo en misma terminal)
./scripts\dev.sh
```

---

## Verificación

### PowerShell

```powershell
# Health check
Invoke-WebRequest http://localhost:8000/health

# Docs interactivos
Start-Process http://localhost:8000/docs

# Test chat (MOCK_MODE)
$body = @{
    user_id = "test_user"
    session_id = "test_session"
    message = "Hola, estoy probando el chat"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri http://localhost:8000/api/v1/chat/message `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Bash

```bash
# Health check
curl http://localhost:8000/health

# Test chat
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","session_id":"test","message":"Hola"}'
```

---

## URLs

- **Backend API Docs**: http://localhost:8000/docs
- **Backend Health**: http://localhost:8000/health
- **Frontend Web**: http://localhost:8081

---

## Modo MOCK (por defecto)

El proyecto está configurado en modo MOCK para desarrollo local:

- ✅ **Backend**: `MOCK_MODE=true` en `src/backend/.env`
- ✅ **Frontend**: `EXPO_PUBLIC_MOCK_MODE=true` en `src/frontend/.env`

Esto evita llamar APIs externas (Groq, Google Places, Firebase) y usa respuestas simuladas.

---

## Troubleshooting

### Error: "AttributeError: 'NoneType' object has no attribute 'child'"
**Causa**: Firebase cache intenta inicializarse sin MOCK_MODE
**Fix**: Verificar `MOCK_MODE=true` en `src/backend/.env`

### Timeout 30s en frontend
**Causas posibles**:
1. Backend no corriendo → verificar `uvicorn` activo en puerto 8000
2. CORS bloqueado → verificar logs en terminal del backend
3. Firewall → permitir Python en Windows Defender

**Verificar puerto backend (PowerShell)**:
```powershell
netstat -ano | findstr :8000
```

### Backend corre pero curl no responde (WSL/Bash)
Usar PowerShell o cambiar URL a `127.0.0.1` en lugar de `localhost`:
```bash
curl http://127.0.0.1:8000/health
```

---

## Desactivar MOCK Mode

Para conectar a APIs reales:

1. Editar `src/backend/.env`:
   ```env
   MOCK_MODE=false
   ```

2. Configurar API keys:
   ```env
   GROQ_API_KEY=tu_key_real
   GOOGLE_PLACES_API_KEY=tu_key_real
   FIREBASE_CREDENTIALS_PATH=ruta/a/credentials.json
   ```

3. Reiniciar backend (Ctrl+C y volver a correr `uvicorn`)
