# restart_backend.ps1 - Matar python y reiniciar backend

Write-Host "Reiniciando Backend..." -ForegroundColor Cyan

# Matar procesos python en puerto 8000
Write-Host "`n1. Matando procesos Python..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Verificar puerto libre
$port = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "Puerto 8000 aun ocupado. Matando proceso..." -ForegroundColor Red
    $processId = $port.OwningProcess
    Stop-Process -Id $processId -Force
    Start-Sleep -Seconds 2
}

Write-Host "Puerto 8000 libre" -ForegroundColor Green

# Iniciar backend
Write-Host "`n2. Iniciando backend..." -ForegroundColor Yellow
Write-Host "Directorio: C:\ProyectosTrabajo\TAi\src\backend\TAi_backend" -ForegroundColor Gray

$env:Path += ";C:\ProyectosTrabajo\TAi\src\backend\TAi_backend\venv\Scripts"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd C:\ProyectosTrabajo\TAi\src\backend\TAi_backend; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)

Write-Host "`nEsperando 5s para que el backend inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test
Write-Host "`n3. Verificando..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing
    Write-Host "Backend corriendo! Status: $($health.StatusCode)" -ForegroundColor Green
    Write-Host "`nDocs: http://localhost:8000/docs" -ForegroundColor Cyan
} catch {
    Write-Host "Backend no responde: $_" -ForegroundColor Red
}
