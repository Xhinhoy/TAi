# TAi - Justfile
# https://github.com/casey/just

# Variables
frontend_dir := "src/frontend"
backend_dir := "src/backend/TAi_backend"

# Lista de comandos disponibles
default:
  @just --list

# Instala todas las dependencias
setup:
  @echo "Instalando dependencias..."
  cd {{frontend_dir}} && npm install
  cd src/backend && pip install -r requirements.txt
  @echo "Setup completado. Revisa .env"

# Levanta frontend + backend en paralelo
dev:
  @echo "Levantando frontend + backend..."
  just frontend & just backend

# Solo frontend
frontend:
  cd {{frontend_dir}} && npm run dev

# Solo backend
backend:
  cd {{backend_dir}} && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Linters
lint:
  cd {{frontend_dir}} && npm run lint
  cd src/backend && black . && ruff check .

# Tests
test:
  cd {{frontend_dir}} && npm test
  cd src/backend && pytest

# Limpieza
clean:
  @echo "Limpiando temporales..."
  find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name ".expo" -exec rm -rf {} + 2>/dev/null || true
