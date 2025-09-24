// src/database/utils.ts
import { GeoPoint } from "firebase/firestore";

// Convertir coordenadas normales a GeoPoint
export const createGeoPoint = (lat: number, lng: number): GeoPoint => {
  return new GeoPoint(lat, lng);
};

// Convertir GeoPoint a coordenadas normales
export const geoPointToCoords = (geoPoint: GeoPoint): { lat: number; lng: number } => {
  return { lat: geoPoint.latitude, lng: geoPoint.longitude };
};

// Función para calcular distancia entre dos puntos (en km)
export const calculateDistance = (
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Validar coordenadas
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Convertir timestamp a fecha legible
export const formatTimestamp = (timestamp: any): string => {
  if (!timestamp || !timestamp.toDate) return '';
  return timestamp.toDate().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};