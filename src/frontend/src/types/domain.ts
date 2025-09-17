export type Place = {
  id: string;
  name: string;
  coords: { lat:number; lng:number };
  rating?: number;
  address?: string;
  priceLevel?: 0|1|2|3|4;
  photos?: string[];
  source: "google"|"tripadvisor"|"hybrid";
  categories: string[];
};
export type ItineraryItem = {
  day: number; placeId: string; start: string; end: string; notes?: string;
};
export type Itinerary = {
  id: string; title: string; city: string; days: number; items: ItineraryItem[]; ownerUid: string; score?: number;
};
