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
  selectedMarkerId?: string;
}

export default function MapContainer({ center, zoom = 13, markers, selectedMarkerId }: MapContainerProps) {
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
      // Determinar si este marcador está seleccionado
      const isSelected = marker.id === selectedMarkerId;

      // Crear icono personalizado con color dinámico
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${isSelected ? '#ef4444' : '#3b82f6'};
          width: ${isSelected ? '32px' : '24px'};
          height: ${isSelected ? '32px' : '24px'};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,${isSelected ? '0.5' : '0.3'});
          transition: all 0.3s ease;
        "></div>`,
        iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
        iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12],
      });

      const markerInstance = L.marker([marker.lat, marker.lng], { icon: customIcon })
        .bindPopup(`<strong>${marker.name}</strong><br/>${marker.rating} estrellas`)
        .addTo(layerGroup);

      // Abrir popup automáticamente si está seleccionado
      if (isSelected) {
        markerInstance.openPopup();
      }
    });

    return () => {
      layerGroup.clearLayers();
    };
  }, [markers, selectedMarkerId]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
