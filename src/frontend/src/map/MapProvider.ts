import LeafletMapProvider from './providers/leaflet';
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
  // Expo usa process.env en lugar de import.meta.env
  const provider = process.env.EXPO_PUBLIC_MAP_PROVIDER || 'leaflet';
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (provider === 'google' && apiKey) {
    return new GoogleMapProvider();
  }

  return new LeafletMapProvider();
}
