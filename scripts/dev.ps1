# TAi - Script de desarrollo para Windows (PowerShell)
# Levanta frontend (Expo) y backend (FastAPI) en paralelo

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TAi - Modo Desarrollo (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar dependencias
if (-not (Test-Path "src\frontend\node_modules")) {
    Write-Host "[ERROR] node_modules no encontrado. Ejecuta: cd src/frontend && npm install" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "src\backend\.env")) {
    Write-Host "[WARN] .env no encontrado en backend. Copiando .env.example..." -ForegroundColor Yellow
    Copy-Item "src\backend\.env.example" "src\backend\.env"
}

if (-not (Test-Path "src\frontend\.env")) {
    Write-Host "[WARN] .env no encontrado en frontend. Copiando .env.example..." -ForegroundColor Yellow
    Copy-Item "src\frontend\.env.example" "src\frontend\.env"
}

Write-Host "[INFO] Levantando backend (FastAPI) en puerto 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd src\backend\TAi_backend; if (Test-Path venv\Scripts\Activate.ps1) { .\venv\Scripts\Activate.ps1 }; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 2

Write-Host "[INFO] Levantando frontend (Expo) en puerto 8081..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd src\frontend; npm run dev"

Write-Host ""
Write-Host "[OK] Servicios iniciados:" -ForegroundColor Green
Write-Host "  - Backend:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:8081" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Ctrl+C en cada ventana para detener" -ForegroundColor Yellow
