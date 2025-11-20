import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loadPreferences, savePreferences, UserPreferences } from './preferencesModel';

const CATEGORIES = [
  { id: 'comida', label: 'Comida' },
  { id: 'cultura', label: 'Cultura' },
  { id: 'naturaleza', label: 'Naturaleza' },
  { id: 'vida_nocturna', label: 'Vida Nocturna' },
];

export default function PreferencesPage() {
  const navigation = useNavigation();
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences());

  const toggleCategory = (cat: string) => {
    const updated = preferences.categories.includes(cat)
      ? preferences.categories.filter((c) => c !== cat)
      : [...preferences.categories, cat];
    setPreferences({ ...preferences, categories: updated });
  };

  const handleSave = () => {
    savePreferences(preferences);
    navigation.navigate('Buscar' as never);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Preferencias</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Categorias</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  preferences.categories.includes(cat.id) && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    preferences.categories.includes(cat.id) && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Radio de busqueda: {preferences.radiusKm} km</Text>
          {Platform.OS === 'web' ? (
            <input
              type="range"
              min="1"
              max="30"
              value={preferences.radiusKm}
              onChange={(e) =>
                setPreferences({ ...preferences, radiusKm: Number(e.target.value) })
              }
              style={{ width: '100%' }}
            />
          ) : (
            <View style={styles.sliderPlaceholder}>
              <Text>Use web para ajustar radio</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Rating minimo</Text>
          {Platform.OS === 'web' ? (
            <select
              value={preferences.minRating}
              onChange={(e) =>
                setPreferences({ ...preferences, minRating: Number(e.target.value) })
              }
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
              }}
            >
              <option value={0}>Todos</option>
              <option value={3}>3+</option>
              <option value={4}>4+</option>
              <option value={4.5}>4.5+</option>
            </select>
          ) : (
            <View style={styles.sliderPlaceholder}>
              <Text>Use web para ajustar rating</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  categoryChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryChipTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  sliderPlaceholder: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
