/**
 * ValidationResults.tsx - Pantalla de resultados de validación
 * Muestra score, red flags, aspectos positivos/negativos y alternativas
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ValidationResponse } from '../../../api/validationService';

interface Props {
  results: ValidationResponse;
  onReset: () => void;
}

export default function ValidationResults({ results, onReset }: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Verde
    if (score >= 60) return '#f59e0b'; // Amarillo
    return '#ef4444'; // Rojo
  };

  const getRecommendationColor = () => {
    switch (results.recomendacion) {
      case 'RESERVAR_CON_CONFIANZA':
        return '#10b981';
      case 'CONSIDERAR_ALTERNATIVAS':
        return '#f59e0b';
      case 'NO_RECOMENDADO':
        return '#ef4444';
    }
  };

  const getRecommendationText = () => {
    switch (results.recomendacion) {
      case 'RESERVAR_CON_CONFIANZA':
        return 'Muy confiable';
      case 'CONSIDERAR_ALTERNATIVAS':
        return 'Considerar alternativas';
      case 'NO_RECOMENDADO':
        return 'No recomendado';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Score principal */}
      <View style={[styles.scoreCard, { backgroundColor: getScoreColor(results.score_realidad) + '15' }]}>
        <Text style={styles.scoreLabel}>Score de Realidad</Text>
        <Text style={[styles.scoreNumber, { color: getScoreColor(results.score_realidad) }]}>
          {results.score_realidad}
        </Text>
        <Text style={styles.scoreTotal}>/100</Text>

        <View style={[styles.recommendationBadge, { backgroundColor: getRecommendationColor() }]}>
          <Text style={styles.recommendationText}>{getRecommendationText()}</Text>
        </View>
      </View>

      {/* Lugar identificado */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lugar Identificado</Text>
        <Text style={styles.placeName}>{results.lugar_identificado.nombre}</Text>
        <Text style={styles.placeLocation}>
          {results.lugar_identificado.ubicacion.ciudad}, {results.lugar_identificado.ubicacion.pais}
        </Text>
        <View style={styles.placeType}>
          <Text style={styles.placeTypeText}>{results.lugar_identificado.tipo}</Text>
        </View>
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Confianza de identificación</Text>
          <Text style={styles.confidenceValue}>{results.lugar_identificado.confianza_identificacion}%</Text>
        </View>
      </View>

      {/* Razón de recomendación */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>¿Por qué esta recomendación?</Text>
        <Text style={styles.reasonText}>{results.razon_recomendacion}</Text>
      </View>

      {/* Red Flags */}
      {results.analisis.red_flags.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flag" size={20} color="#ef4444" />
            <Text style={styles.cardTitle}>Red Flags</Text>
          </View>
          {results.analisis.red_flags.map((flag, index) => (
            <View
              key={index}
              style={[
                styles.redFlagItem,
                {
                  backgroundColor:
                    flag.severidad === 'alta'
                      ? '#fee2e2'
                      : flag.severidad === 'media'
                      ? '#fef3c7'
                      : '#f3f4f6',
                },
              ]}
            >
              <View style={styles.redFlagHeader}>
                <Text
                  style={[
                    styles.severityBadge,
                    {
                      color:
                        flag.severidad === 'alta'
                          ? '#991b1b'
                          : flag.severidad === 'media'
                          ? '#92400e'
                          : '#374151',
                    },
                  ]}
                >
                  {flag.severidad.toUpperCase()}
                </Text>
                <Text style={styles.frequencyText}>{flag.frecuencia}</Text>
              </View>
              <Text style={styles.redFlagDescription}>{flag.descripcion}</Text>
              <Text style={styles.redFlagSource}>Fuente: {flag.fuente}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Aspectos Positivos */}
      {results.analisis.aspectos_positivos.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Aspectos Positivos</Text>
          </View>
          {results.analisis.aspectos_positivos.map((aspecto, index) => (
            <View key={index} style={styles.aspectItem}>
              <Ionicons name="checkmark" size={18} color="#10b981" />
              <View style={styles.aspectContent}>
                <Text style={styles.aspectText}>
                  {aspecto.aspecto}{' '}
                  <Text style={styles.aspectFrequency}>({aspecto.mencionado_en})</Text>
                </Text>
                {aspecto.descripcion && (
                  <Text style={styles.aspectDescription}>{aspecto.descripcion}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Aspectos Negativos */}
      {results.analisis.aspectos_negativos.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.cardTitle}>Ten en Cuenta</Text>
          </View>
          {results.analisis.aspectos_negativos.map((aspecto, index) => (
            <View key={index} style={styles.aspectItem}>
              <Ionicons name="remove-circle-outline" size={18} color="#f59e0b" />
              <View style={styles.aspectContent}>
                <Text style={styles.aspectText}>
                  {aspecto.aspecto}{' '}
                  <Text style={styles.aspectFrequency}>({aspecto.mencionado_en})</Text>
                </Text>
                {aspecto.descripcion && (
                  <Text style={styles.aspectDescription}>{aspecto.descripcion}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Discrepancia Imagen vs Realidad */}
      {results.analisis.discrepancia_imagen_realidad.hay_discrepancia && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="images" size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>Imagen vs Realidad</Text>
          </View>

          {results.analisis.discrepancia_imagen_realidad.elementos_coinciden.length > 0 && (
            <View style={styles.discrepancySection}>
              <Text style={styles.discrepancyTitle}>✓ Lo que SÍ coincide:</Text>
              {results.analisis.discrepancia_imagen_realidad.elementos_coinciden.map((elem, index) => (
                <Text key={index} style={styles.discrepancyItem}>• {elem}</Text>
              ))}
            </View>
          )}

          {results.analisis.discrepancia_imagen_realidad.elementos_no_coinciden.length > 0 && (
            <View style={styles.discrepancySection}>
              <Text style={styles.discrepancyTitle}>✗ Lo que NO coincide:</Text>
              {results.analisis.discrepancia_imagen_realidad.elementos_no_coinciden.map((elem, index) => (
                <Text key={index} style={styles.discrepancyItem}>• {elem}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tendencia Temporal */}
      {results.analisis.tendencia_temporal.evidencia && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={20} color="#6b7280" />
            <Text style={styles.cardTitle}>Tendencia</Text>
          </View>

          <View style={styles.trendBadges}>
            {results.analisis.tendencia_temporal.mejorando && (
              <View style={[styles.trendBadge, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="arrow-up" size={16} color="#059669" />
                <Text style={[styles.trendText, { color: '#059669' }]}>Mejorando</Text>
              </View>
            )}
            {results.analisis.tendencia_temporal.estable && (
              <View style={[styles.trendBadge, { backgroundColor: '#e5e7eb' }]}>
                <Ionicons name="remove" size={16} color="#6b7280" />
                <Text style={[styles.trendText, { color: '#6b7280' }]}>Estable</Text>
              </View>
            )}
            {results.analisis.tendencia_temporal.empeorando && (
              <View style={[styles.trendBadge, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="arrow-down" size={16} color="#dc2626" />
                <Text style={[styles.trendText, { color: '#dc2626' }]}>Empeorando</Text>
              </View>
            )}
          </View>

          <Text style={styles.trendEvidence}>{results.analisis.tendencia_temporal.evidencia}</Text>
        </View>
      )}

      {/* Alternativas */}
      {results.alternativas.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb" size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>
              {results.recomendacion === 'NO_RECOMENDADO'
                ? 'Te recomendamos estas alternativas'
                : 'Encontramos mejores opciones'}
            </Text>
          </View>
          {results.alternativas.map((alt, index) => (
            <View key={index} style={styles.alternativeCard}>
              <Text style={styles.alternativeName}>{alt.nombre}</Text>
              <Text style={styles.alternativeLocation}>{alt.ubicacion}</Text>
              <Text style={styles.alternativeReason}>✨ {alt.por_que_mejor}</Text>
              <View style={styles.alternativeStats}>
                {alt.rating && (
                  <Text style={styles.alternativeStat}>⭐ {alt.rating}</Text>
                )}
                {alt.distancia_km && (
                  <Text style={styles.alternativeStat}>📍 {alt.distancia_km} km</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.sources}>
          <Text style={styles.sourcesLabel}>Fuentes consultadas:</Text>
          {results.fuentes_consultadas.google_places && (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>Google Places</Text>
            </View>
          )}
          {results.fuentes_consultadas.tripadvisor && (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>TripAdvisor</Text>
            </View>
          )}
        </View>
        <Text style={styles.processingTime}>
          Procesado en {results.tiempo_procesamiento_segundos.toFixed(1)}s
        </Text>
      </View>

      {/* Botón para validar otro */}
      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.resetButtonText}>Validar otro lugar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scoreCard: {
    alignItems: 'center',
    padding: 32,
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  scoreTotal: {
    fontSize: 24,
    color: '#9ca3af',
    marginBottom: 16,
  },
  recommendationBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recommendationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  placeLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  placeType: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  placeTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    textTransform: 'capitalize',
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  redFlagItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  redFlagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityBadge: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  frequencyText: {
    fontSize: 12,
    color: '#6b7280',
  },
  redFlagDescription: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  redFlagSource: {
    fontSize: 11,
    color: '#9ca3af',
  },
  aspectItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  aspectContent: {
    flex: 1,
  },
  aspectText: {
    fontSize: 14,
    color: '#374151',
  },
  aspectFrequency: {
    fontSize: 12,
    color: '#9ca3af',
  },
  aspectDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  discrepancySection: {
    marginBottom: 16,
  },
  discrepancyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  discrepancyItem: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
    marginBottom: 4,
  },
  trendBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendEvidence: {
    fontSize: 13,
    color: '#6b7280',
  },
  alternativeCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  alternativeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  alternativeLocation: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  alternativeReason: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
  },
  alternativeStats: {
    flexDirection: 'row',
    gap: 12,
  },
  alternativeStat: {
    fontSize: 12,
    color: '#6b7280',
  },
  footer: {
    padding: 20,
    gap: 12,
  },
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  sourcesLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sourceBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  processingTime: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
