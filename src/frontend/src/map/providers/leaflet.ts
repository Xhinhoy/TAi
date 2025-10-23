import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { IMapProvider, MapMarker, MapBounds } from '../MapProvider';

// Fix Leaflet default icon paths issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '',
  iconUrl: '',
  shadowUrl: '',
});

export default class LeafletMapProvider implements IMapProvider {
  private map: L.Map | null = null;
  private markers: Map<string, L.Marker> = new Map();
  private markerLayer: L.LayerGroup | null = null;
  private clickCallback?: (id: string) => void;

  async init(container: HTMLElement): Promise<void> {
    this.map = L.map(container, {
      center: [-33.4489, -70.6693] as L.LatLngTuple,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
  }

  destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers.clear();
  }

  setCenter(lat: number, lng: number, zoom?: number): void {
    if (!this.map) return;
    this.map.setView([lat, lng] as L.LatLngTuple, zoom ?? this.map.getZoom());
  }

  setZoom(zoom: number): void {
    if (!this.map) return;
    this.map.setZoom(zoom);
  }

  fitBounds(bounds: MapBounds): void {
    if (!this.map) return;
    this.map.fitBounds([
      [bounds.south, bounds.west] as L.LatLngTuple,
      [bounds.north, bounds.east] as L.LatLngTuple,
    ]);
  }

  addMarkers(markers: MapMarker[]): void {
    if (!this.map || !this.markerLayer) return;

    this.clearMarkers();

    const categoryColors: Record<string, string> = {
      comida: '#ef4444',
      cultura: '#3b82f6',
      naturaleza: '#10b981',
      vida_nocturna: '#8b5cf6',
    };

    markers.forEach((m) => {
      const color = categoryColors[m.category || ''] || '#6b7280';
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([m.lat, m.lng] as L.LatLngTuple, { icon })
        .bindPopup(`<strong>${m.title}</strong>`)
        .addTo(this.markerLayer!);

      marker.on('click', () => {
        if (this.clickCallback) this.clickCallback(m.id);
      });

      this.markers.set(m.id, marker);
    });
  }

  clearMarkers(): void {
    if (this.markerLayer) {
      this.markerLayer.clearLayers();
    }
    this.markers.clear();
  }

  highlightMarker(id: string): void {
    const marker = this.markers.get(id);
    if (marker) {
      marker.openPopup();
      marker.getElement()?.classList.add('highlighted');
    }
  }

  unhighlightMarker(id: string): void {
    const marker = this.markers.get(id);
    if (marker) {
      marker.closePopup();
      marker.getElement()?.classList.remove('highlighted');
    }
  }

  onMarkerClick(callback: (id: string) => void): void {
    this.clickCallback = callback;
  }
}
