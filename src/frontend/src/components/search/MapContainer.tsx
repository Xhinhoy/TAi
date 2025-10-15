import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

    markers.forEach((marker) => {
      L.marker([marker.lat, marker.lng])
        .bindPopup(`<strong>${marker.name}</strong><br/>${marker.rating} estrellas`)
        .addTo(layerGroup);
    });

    return () => {
      layerGroup.clearLayers();
    };
  }, [markers]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
