import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SearchBar from '../../components/search/SearchBar';
import ResultsList, { Place } from '../../components/search/ResultsList';
import MapContainer from '../../components/search/MapContainer';
import placesData from '../../data/places.json';
import { loadPreferences } from '../../preferences/preferencesModel';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Search() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: -33.4489,
    lng: -70.6693,
  });
  const [showMap, setShowMap] = useState(!isMobile);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setUserLocation({ lat: -33.4489, lng: -70.6693 });
        }
      );
    }
  }, []);

  const performSearch = useCallback(() => {
    const prefs = loadPreferences();
    let filtered = placesData as Place[];

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      );
    }

    if (prefs.categories.length > 0) {
      filtered = filtered.filter((p) => prefs.categories.includes(p.category));
    }

    if (prefs.minRating > 0) {
      filtered = filtered.filter((p) => p.rating >= prefs.minRating);
    }

    if (userLocation && prefs.radiusKm) {
      filtered = filtered
        .map((p) => ({
          ...p,
          distance: calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng),
        }))
        .filter((p) => p.distance! <= prefs.radiusKm);
    }

    filtered.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return b.rating - a.rating;
    });

    setResults(filtered);
  }, [query, userLocation]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleViewOnMap = (id: string) => {
    setSelectedId(id);
    if (isMobile) {
      setShowMap(true);
    }
    const place = results.find((p) => p.id === id);
    if (place) {
      setUserLocation({ lat: place.lat, lng: place.lng });
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Busqueda con mapa solo disponible en web</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buscar Lugares</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Preferencias' as never)}
            style={styles.preferencesButton}
          >
            <Text style={styles.preferencesButtonText}>Preferencias</Text>
          </TouchableOpacity>
          {isMobile && (
            <TouchableOpacity
              onPress={() => setShowMap(!showMap)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleButtonText}>
                {showMap ? 'Ver Lista' : 'Ver Mapa'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.content, isMobile && styles.contentMobile]}>
        {(!isMobile || !showMap) && (
          <View style={[styles.sidebar, isMobile && styles.sidebarMobile]}>
            <View style={styles.searchSection}>
              <SearchBar onSearch={setQuery} />
            </View>

            <View style={styles.resultsContainer}>
              <ResultsList results={results} onViewOnMap={handleViewOnMap} />
            </View>
          </View>
        )}

        {(!isMobile || showMap) && (
          <View style={[styles.mapSection, isMobile && styles.mapSectionMobile]}>
            <MapContainer
              center={userLocation}
              zoom={13}
              markers={results.map((p) => ({
                id: p.id,
                lat: p.lat,
                lng: p.lng,
                name: p.name,
                rating: p.rating,
              }))}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  preferencesButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  preferencesButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  contentMobile: {
    flexDirection: 'column',
  },
  sidebar: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  sidebarMobile: {
    width: '100%',
    borderRightWidth: 0,
  },
  searchSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  mapSection: {
    flex: 1,
  },
  mapSectionMobile: {
    width: '100%',
    height: '100%',
  },
});
