import { Place } from "../types/domain";
<<<<<<< HEAD
import { placesRepo, createGeoPoint } from "../database";

// Búsqueda de lugares (ahora usando Firestore)
export async function searchPlaces(query?: string): Promise<Place[]> {
  if (query && query.length >= 2) {
    return await placesRepo.searchByName(query);
  }

  // Si no hay query, devolver lugares populares
  return await placesRepo.getAll(20);
}

// Buscar lugares por ciudad
export async function getPlacesByCity(city: string): Promise<Place[]> {
  return await placesRepo.getByCity(city);
}

// Buscar lugares por categorías (para filtros)
export async function getPlacesByCategories(categories: string[]): Promise<Place[]> {
  return await placesRepo.getByCategories(categories);
}

// Crear lugar (para cuando integres APIs externas)
export async function createPlace(placeData: {
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: "google" | "tripadvisor" | "hybrid";
  categories: string[];
  rating?: number;
  priceLevel?: 0|1|2|3|4;
  photos?: string[];
}): Promise<string> {
  const { lat, lng, ...rest } = placeData;
  return await placesRepo.create({
    ...rest,
    coords: createGeoPoint(lat, lng)
  });
}
=======
import { placesService } from "./services";

/**
 * Search places with optional query
 * Now using the backend API instead of direct Firestore access
 */
export async function searchPlaces(query?: string): Promise<Place[]> {
  if (query && query.length >= 2) {
    return await placesService.search({ query, limit: 20 });
  }

  // If no query, return popular places
  return await placesService.getPopular(20);
}

/**
 * Search places by city
 */
export async function getPlacesByCity(city: string): Promise<Place[]> {
  return await placesService.search({ query: city, limit: 50 });
}

/**
 * Search places by categories
 */
export async function getPlacesByCategories(categories: string[]): Promise<Place[]> {
  // Search for each category and combine results
  const results = await Promise.all(
    categories.map(category => placesService.search({ category, limit: 10 }))
  );

  // Flatten and deduplicate
  const allPlaces = results.flat();
  const uniquePlaces = Array.from(
    new Map(allPlaces.map(place => [place.id, place])).values()
  );

  return uniquePlaces;
}

/**
 * Get nearby places based on location
 */
export async function getNearbyPlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  category?: string
): Promise<Place[]> {
  return await placesService.nearby({
    latitude,
    longitude,
    radius,
    category,
    limit: 20
  });
}

/**
 * Get place details by ID
 */
export async function getPlaceDetails(
  placeId: string,
  source?: 'firebase' | 'google'
): Promise<Place> {
  return await placesService.getDetails(placeId, { source });
}

/**
 * Sync a place from Google Places to Firebase
 */
export async function syncPlaceFromGoogle(placeId: string): Promise<Place> {
  return await placesService.syncFromGoogle(placeId);
}
>>>>>>> origin/NSoto
