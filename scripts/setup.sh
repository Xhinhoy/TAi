#!/usr/bin/env bash
# setup.sh - Setup inicial del proyecto (Linux/macOS/WSL)

set -e

echo "🔧 TAi Monorepo - Setup"
echo ""

# Backend
echo "🐍 Configurando backend..."
cd "$(dirname "$0")/../src/backend/TAi_backend"

if [ ! -d "venv" ]; then
    echo "Creando venv..."
    python3 -m venv venv
fi

echo "Activando venv e instalando deps..."
source venv/bin/activate || source venv/Scripts/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "⚛️  Configurando frontend..."
cd "$(dirname "$0")/../src/frontend"
npm install

echo ""
echo "✅ Setup completo. Ejecuta: ./scripts/dev.sh"
