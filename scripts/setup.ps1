# setup.ps1 - Setup inicial del proyecto (Windows)

Write-Host "🔧 TAi Monorepo - Setup" -ForegroundColor Cyan
Write-Host ""

# Backend
Write-Host "🐍 Configurando backend..." -ForegroundColor Yellow
cd C:\ProyectosTrabajo\TAi\src\backend\TAi_backend

if (!(Test-Path "venv")) {
    Write-Host "Creando venv..." -ForegroundColor Blue
    python -m venv venv
}

Write-Host "Activando venv e instalando deps..." -ForegroundColor Blue
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

Write-Host ""
Write-Host "⚛️  Configurando frontend..." -ForegroundColor Yellow
cd C:\ProyectosTrabajo\TAi\src\frontend
npm install

Write-Host ""
Write-Host "✅ Setup completo. Ejecuta: .\scripts\dev.ps1" -ForegroundColor Green
