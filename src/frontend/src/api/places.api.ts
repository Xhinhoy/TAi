import { Place } from "../types/domain";
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
