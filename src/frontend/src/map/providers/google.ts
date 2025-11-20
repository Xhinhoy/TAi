import type { IMapProvider, MapMarker, MapBounds } from '../MapProvider';

let googleMapsLoaded = false;

async function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsLoaded) return;
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Google Maps API key not configured');

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default class GoogleMapProvider implements IMapProvider {
  private map: google.maps.Map | null = null;
  private markers: Map<string, google.maps.Marker> = new Map();
  private clickCallback?: (id: string) => void;

  async init(container: HTMLElement): Promise<void> {
    await loadGoogleMapsScript();

    this.map = new google.maps.Map(container, {
      center: { lat: -33.4489, lng: -70.6693 },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
    });
  }

  destroy(): void {
    this.clearMarkers();
    this.map = null;
  }

  setCenter(lat: number, lng: number, zoom?: number): void {
    if (!this.map) return;
    this.map.setCenter({ lat, lng });
    if (zoom !== undefined) this.map.setZoom(zoom);
  }

  setZoom(zoom: number): void {
    if (!this.map) return;
    this.map.setZoom(zoom);
  }

  fitBounds(bounds: MapBounds): void {
    if (!this.map) return;
    const gmapBounds = new google.maps.LatLngBounds(
      { lat: bounds.south, lng: bounds.west },
      { lat: bounds.north, lng: bounds.east }
    );
    this.map.fitBounds(gmapBounds);
  }

  addMarkers(markers: MapMarker[]): void {
    if (!this.map) return;

    this.clearMarkers();

    const categoryColors: Record<string, string> = {
      comida: '#ef4444',
      cultura: '#3b82f6',
      naturaleza: '#10b981',
      vida_nocturna: '#8b5cf6',
    };

    markers.forEach((m) => {
      const color = categoryColors[m.category || ''] || '#6b7280';

      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: this.map!,
        title: m.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8,
        },
      });

      marker.addListener('click', () => {
        if (this.clickCallback) this.clickCallback(m.id);
      });

      this.markers.set(m.id, marker);
    });
  }

  clearMarkers(): void {
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers.clear();
  }

  highlightMarker(id: string): void {
    const marker = this.markers.get(id);
    if (marker) marker.setAnimation(google.maps.Animation.BOUNCE);
  }

  unhighlightMarker(id: string): void {
    const marker = this.markers.get(id);
    if (marker) marker.setAnimation(null);
  }

  onMarkerClick(callback: (id: string) => void): void {
    this.clickCallback = callback;
  }
}
