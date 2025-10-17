#!/usr/bin/env bash
# TAi - Script de desarrollo para Linux/Mac
# Levanta frontend (Expo) y backend (FastAPI) en paralelo

set -e

echo "========================================"
echo "  TAi - Modo Desarrollo (Unix)"
echo "========================================"
echo ""

# Verificar dependencias
if [ ! -d "src/frontend/node_modules" ]; then
    echo "[ERROR] node_modules no encontrado. Ejecuta: cd src/frontend && npm install"
    exit 1
fi

if [ ! -f "src/backend/.env" ]; then
    echo "[WARN] .env no encontrado en backend. Copiando .env.example..."
    cp src/backend/.env.example src/backend/.env
fi

if [ ! -f "src/frontend/.env" ]; then
    echo "[WARN] .env no encontrado en frontend. Copiando .env.example..."
    cp src/frontend/.env.example src/frontend/.env
fi

echo "[INFO] Levantando backend (FastAPI) en puerto 8000..."
(cd src/backend/TAi_backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!

sleep 2

echo "[INFO] Levantando frontend (Expo) en puerto 8081..."
(cd src/frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "[OK] Servicios iniciados:"
echo "  - Backend:  http://localhost:8000/docs"
echo "  - Frontend: http://localhost:8081"
echo ""
echo "Presiona Ctrl+C para detener ambos servicios"

# Trap para matar procesos al salir
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Esperar a que terminen
wait
