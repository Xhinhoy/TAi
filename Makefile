.PHONY: help setup dev frontend backend lint test clean

help:
	@echo "TAi - Makefile targets"
	@echo "  setup      Instala todas las dependencias"
	@echo "  dev        Levanta frontend + backend en paralelo"
	@echo "  frontend   Corre solo frontend (Expo)"
	@echo "  backend    Corre solo backend (FastAPI)"
	@echo "  lint       Ejecuta linters (eslint + black)"
	@echo "  test       Ejecuta tests (jest + pytest)"
	@echo "  clean      Limpia archivos temporales"

setup:
	@echo "Instalando dependencias frontend..."
	cd src/frontend && npm install
	@echo "Instalando dependencias backend..."
	cd src/backend && pip install -r requirements.txt
	@echo "Setup completado. Revisa archivos .env"

dev:
	@echo "Levantando frontend + backend..."
	@$(MAKE) -j 2 frontend backend

frontend:
	@echo "Iniciando frontend..."
	cd src/frontend && npm run dev

backend:
	@echo "Iniciando backend..."
	cd src/backend/TAi_backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

lint:
	@echo "Ejecutando linters..."
	cd src/frontend && npm run lint
	cd src/backend && black . && ruff check .

test:
	@echo "Ejecutando tests..."
	cd src/frontend && npm test
	cd src/backend && pytest

clean:
	@echo "Limpiando archivos temporales..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".expo" -exec rm -rf {} + 2>/dev/null || true
	rm -rf src/backend/TAi_backend/venv
	@echo "Limpieza completada"
