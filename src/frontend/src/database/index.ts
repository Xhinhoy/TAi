// src/database/index.ts
export { db } from "./config";
export { PlacesRepository } from "./places.repository";
export { ItinerariesRepository } from "./itineraries.repository";

// Utility functions
export {
  createGeoPoint,
  geoPointToCoords,
  calculateDistance
} from "./utils";

// Instancias singleton para usar en toda la app
import { PlacesRepository } from "./places.repository";
import { ItinerariesRepository } from "./itineraries.repository";

export const placesRepo = new PlacesRepository();
export const itinerariesRepo = new ItinerariesRepository();