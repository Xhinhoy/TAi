import { Timestamp, GeoPoint } from "firebase/firestore";

export type Place = {
  id: string;
  name: string;
  coords: GeoPoint;
  rating?: number;
  address?: string;
  priceLevel?: 0|1|2|3|4;
  photos?: string[];
  source: "google"|"tripadvisor"|"hybrid";
  categories: string[];
  opening_hours?: {
  open_now?: boolean;
  weekday_text?: string[];
  };
  openNow?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type ItineraryItem = {
  day: number;
  placeId: string;
  start: string;
  end: string;
  notes?: string;
};

export type Itinerary = {
  id: string;
  title: string;
  city: string;
  days: number;
  items: ItineraryItem[];
  ownerUid: string;
  score?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
export interface UserPreferences {
  budget?: 'low' | 'medium' | 'high';
  interests: string[];
  preferredLanguage?: string;
  accessibility?: string[];
}
