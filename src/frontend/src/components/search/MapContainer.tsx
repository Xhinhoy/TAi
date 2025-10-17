import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '',
  iconUrl: '',
  shadowUrl: '',
});

interface Marker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  rating: number;
}

interface MapContainerProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers: Marker[];
}

export default function MapContainer({ center, zoom = 13, markers }: MapContainerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([center.lat, center.lng], zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;

    const layerGroup = L.layerGroup().addTo(mapRef.current);

    // Create custom icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    markers.forEach((marker) => {
      L.marker([marker.lat, marker.lng], { icon: customIcon })
        .bindPopup(`<strong>${marker.name}</strong><br/>${marker.rating} estrellas`)
        .addTo(layerGroup);
    });

    return () => {
      layerGroup.clearLayers();
    };
  }, [markers]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
