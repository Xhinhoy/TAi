import { Timestamp, GeoPoint } from "firebase/firestore";

export type Place = {
  id: string;
  place_id?: string; // Google Places ID (ChIJ...)
  name: string;
  coords: GeoPoint;
  rating?: number;
  address?: string;
  description?: string;
  priceLevel?: 0|1|2|3|4;
  photos?: string[];
  source: "google"|"tripadvisor"|"hybrid";
  categories: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type ItineraryActivity = {
  place_id: string;
  place_name: string;
  start: string;
  end: string;
  price_level: number;
  price_display: string;
  notes: string;
};

export type ItineraryDay = {
  day: number;
  activities: ItineraryActivity[];
};

export type Itinerary = {
  id: string;
  title: string;
  city: string;
  days: ItineraryDay[];
  owner_uid?: string;
  ownerUid?: string;  // Alias para compatibilidad
  reasoning?: string;
  created_at?: any;
  createdAt?: Timestamp;
  updated_at?: any;
  updatedAt?: Timestamp;
};

// Tipo legacy para compatibilidad con código antiguo
export type ItineraryItem = {
  day: number;
  placeId: string;
  start: string;
  end: string;
  notes?: string;
};
