"""Mock mode utilities for local development"""
import json
import os
from pathlib import Path
from typing import List, Dict, Any


def get_mock_data_path() -> Path:
    """Retorna la ruta al directorio de mocks"""
    return Path(__file__).parent.parent.parent / "mocks"


def load_mock_places() -> List[Dict[str, Any]]:
    """Carga lugares mock desde JSON"""
    mock_file = get_mock_data_path() / "places.json"
    if not mock_file.exists():
        return []
    with open(mock_file, "r", encoding="utf-8") as f:
        return json.load(f)


def load_mock_itineraries() -> List[Dict[str, Any]]:
    """Carga itinerarios mock desde JSON"""
    mock_file = get_mock_data_path() / "itineraries.json"
    if not mock_file.exists():
        return []
    with open(mock_file, "r", encoding="utf-8") as f:
        return json.load(f)


def mock_google_places_search(query: str, location: tuple = None) -> List[Dict[str, Any]]:
    """Mock de búsqueda de Google Places"""
    places = load_mock_places()
    # Filtro simple por query en nombre
    if query:
        places = [p for p in places if query.lower() in p["name"].lower()]
    return places


def mock_groq_llm_response(prompt: str) -> str:
    """Mock de respuesta de Groq LLM"""
    return (
        "Esta es una respuesta mock del agente IA. "
        "En producción, aquí vendría la respuesta de Groq (llama-3.x). "
        f"Prompt recibido: {prompt[:100]}..."
    )
