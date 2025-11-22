"""
Utilidades para generar hashes de imágenes
Permite detectar screenshots duplicados y cachear resultados
"""

import hashlib
from typing import BinaryIO
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)


def generate_image_hash(image_bytes: bytes) -> str:
    """
    Genera un hash MD5 del contenido de una imagen

    Args:
        image_bytes: Bytes de la imagen

    Returns:
        Hash MD5 en formato hexadecimal
    """
    try:
        return hashlib.md5(image_bytes).hexdigest()
    except Exception as e:
        logger.error(f"Error generando hash de imagen: {str(e)}")
        raise


def generate_perceptual_hash(image_bytes: bytes) -> str:
    """
    Genera un hash perceptual (pHash) de una imagen
    Útil para detectar imágenes similares aunque tengan pequeñas diferencias
    (ej: misma imagen con diferente compresión)

    Args:
        image_bytes: Bytes de la imagen

    Returns:
        Hash perceptual en formato hexadecimal
    """
    try:
        # Abrir imagen
        image = Image.open(io.BytesIO(image_bytes))

        # Convertir a escala de grises
        image = image.convert('L')

        # Redimensionar a 8x8 (estándar para pHash)
        image = image.resize((8, 8), Image.Resampling.LANCZOS)

        # Obtener píxeles
        pixels = list(image.getdata())

        # Calcular promedio
        avg = sum(pixels) / len(pixels)

        # Generar hash basado en promedio
        bits = ''.join('1' if pixel > avg else '0' for pixel in pixels)

        # Convertir a hexadecimal
        return hex(int(bits, 2))[2:].zfill(16)

    except Exception as e:
        logger.error(f"Error generando hash perceptual: {str(e)}")
        # Fallback a hash normal
        return generate_image_hash(image_bytes)


def generate_quick_hash(file_size: int, modification_time: float = None) -> str:
    """
    Genera un hash rápido basado en metadata (sin leer toda la imagen)
    Menos preciso pero más rápido

    Args:
        file_size: Tamaño del archivo en bytes
        modification_time: Timestamp de modificación (opcional)

    Returns:
        Hash MD5 de la metadata
    """
    try:
        data = f"{file_size}"
        if modification_time:
            data += f"_{modification_time}"

        return hashlib.md5(data.encode()).hexdigest()
    except Exception as e:
        logger.error(f"Error generando quick hash: {str(e)}")
        raise


def get_image_info(image_bytes: bytes) -> dict:
    """
    Obtiene información de una imagen

    Args:
        image_bytes: Bytes de la imagen

    Returns:
        Dict con información de la imagen
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))

        return {
            'format': image.format,
            'mode': image.mode,
            'size': image.size,
            'width': image.width,
            'height': image.height,
            'file_size_bytes': len(image_bytes),
            'file_size_kb': round(len(image_bytes) / 1024, 2),
            'file_size_mb': round(len(image_bytes) / 1024 / 1024, 2),
        }
    except Exception as e:
        logger.error(f"Error obteniendo info de imagen: {str(e)}")
        return {
            'file_size_bytes': len(image_bytes),
            'file_size_kb': round(len(image_bytes) / 1024, 2),
            'file_size_mb': round(len(image_bytes) / 1024 / 1024, 2),
        }
