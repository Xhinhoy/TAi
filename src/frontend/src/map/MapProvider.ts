import GoogleMapProvider from './providers/google';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category?: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface IMapProvider {
  init(container: HTMLElement): Promise<void>;
  destroy(): void;
  setCenter(lat: number, lng: number, zoom?: number): void;
  setZoom(zoom: number): void;
  fitBounds(bounds: MapBounds): void;
  addMarkers(markers: MapMarker[]): void;
  clearMarkers(): void;
  highlightMarker(id: string): void;
  unhighlightMarker(id: string): void;
  onMarkerClick(callback: (id: string) => void): void;
}

export async function createMapProvider(): Promise<IMapProvider> {
  // Solo se usa Google Maps ahora
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    return new GoogleMapProvider();
  }

  throw new Error('Google Maps API key is required. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your environment.');
}
