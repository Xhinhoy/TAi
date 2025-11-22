/**
 * ExperienceValidator.tsx - Validador de experiencias turísticas
 * Permite validar screenshots de Instagram/TikTok
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useImagePicker } from '../../../hooks/useImagePicker';
import { validationService, QualityCheckResponse, ValidationResponse } from '../../../api/validationService';
import ValidationResults from './ValidationResults';

type ScreenState = 'idle' | 'selected' | 'pre_validating' | 'validating' | 'results' | 'error';

export default function ExperienceValidator() {
  const imagePicker = useImagePicker();

  const [state, setState] = useState<ScreenState>('idle');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [qualityCheck, setQualityCheck] = useState<QualityCheckResponse | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSelectImage = async () => {
    try {
      // Resetear estados antes de seleccionar nueva imagen
      setQualityCheck(null);
      setValidationResults(null);
      setErrorMessage('');

      const imageUri = await imagePicker.pickFromGallery();

      if (imageUri) {
        console.log('📸 Imagen seleccionada:', imageUri);
        setSelectedImage(imageUri);
        setState('selected');

        // Iniciar pre-validación automáticamente
        await runPreValidation(imageUri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
      setState('idle');
    }
  };

  const runPreValidation = async (imageUri: string) => {
    setState('pre_validating');
    try {
      console.log('🔍 Iniciando pre-validación...');
      const result = await validationService.checkQuality(imageUri);
      console.log('✅ Pre-validación exitosa:', result);
      setQualityCheck(result);
      setState('selected');
    } catch (error: any) {
      console.error('❌ Error en pre-validación:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setErrorMessage('No se pudo verificar la calidad del screenshot');
      setState('error');
    }
  };

  const handleValidate = async () => {
    if (!selectedImage) {
      console.error('❌ No hay imagen seleccionada');
      return;
    }

    console.log('🔄 Iniciando validación completa...');
    console.log('📸 URI de imagen:', selectedImage);

    setState('validating');
    try {
      const result = await validationService.validate(selectedImage);
      console.log('✅ Resultado de validación:', result);
      setValidationResults(result);
      setState('results');
    } catch (error: any) {
      console.error('❌ Error en validación:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else {
        console.error('❌ NO HAY error.response - Error de red antes de llegar al servidor');
        console.error('Error keys:', Object.keys(error));
      }

      if (error.response?.status === 422) {
        const responseData = error.response.data;
        console.error('❌ Error 422 - Unprocessable Entity');
        console.error('Response data completo:', JSON.stringify(responseData, null, 2));

        // Verificar si es un error de extracción de información del screenshot
        if (responseData?.error === 'validation_failed') {
          const message = responseData.message || '';
          const suggestions = responseData.suggestions || [];

          console.error('❌ El backend no pudo extraer información del screenshot');
          console.error('Mensaje:', message);
          console.error('Sugerencias:', suggestions);

          let errorMsg = '⚠️ No se pudo extraer información del screenshot\n\n';

          if (suggestions.length > 0) {
            errorMsg += 'Asegúrate de que:\n';
            suggestions.forEach((sug: string) => {
              errorMsg += `• ${sug}\n`;
            });
          } else {
            errorMsg += '• El screenshot muestre claramente el nombre del lugar\n';
            errorMsg += '• La ubicación esté etiquetada o visible\n';
            errorMsg += '• La imagen sea clara y legible';
          }

          setErrorMessage(errorMsg);
        }
        // FastAPI devuelve errores de validación en detail (array)
        else if (Array.isArray(responseData?.detail)) {
          const errors = responseData.detail.map((err: any) =>
            `Campo: ${err.loc?.join('.')} - ${err.msg}`
          ).join('\n');
          console.error('Errores de validación:\n', errors);
          setErrorMessage(`Error de validación:\n${errors}`);
        }
        // Otros errores 422
        else {
          const detail = responseData?.detail || 'Validación fallida';
          setErrorMessage(`Error de validación: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        setErrorMessage('La validación está tardando más de lo esperado. Intenta de nuevo.');
      } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        console.error('❌ Network Error detectado');
        setErrorMessage('No se pudo conectar al servidor. Verifica que el backend esté corriendo.');
      } else if (error.message) {
        setErrorMessage(`Error: ${error.message}`);
      } else {
        setErrorMessage('No se pudo completar la validación. Verifica tu conexión a internet.');
      }

      setState('error');
    }
  };

  const handleReset = () => {
    console.log('🔄 Reseteando validador...');
    try {
      setSelectedImage(null);
      setQualityCheck(null);
      setValidationResults(null);
      setErrorMessage('');
      setState('idle');
    } catch (error) {
      console.error('Error al resetear:', error);
    }
  };

  // PANTALLA DE RESULTADOS
  if (state === 'results' && validationResults) {
    return <ValidationResults results={validationResults} onReset={handleReset} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Valida tu experiencia</Text>
        <Text style={styles.subtitle}>
          Descubre si ese lugar de Instagram es realmente así
        </Text>
      </View>

      {/* IDLE STATE - Sin imagen */}
      {state === 'idle' && (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={80} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Selecciona un screenshot</Text>
          <Text style={styles.emptySubtitle}>
            De Instagram, TikTok o cualquier red social
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSelectImage}>
            <Ionicons name="image-outline" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Subir Screenshot</Text>
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Para mejores resultados:</Text>
            <Text style={styles.tipItem}>✓ Incluye la ubicación etiquetada</Text>
            <Text style={styles.tipItem}>✓ Captura la descripción completa</Text>
            <Text style={styles.tipItem}>✓ Asegúrate de que el nombre sea visible</Text>
          </View>
        </View>
      )}

      {/* SELECTED STATE - Imagen seleccionada con pre-validación */}
      {(state === 'selected' || state === 'pre_validating') && selectedImage && (
        <ScrollView style={styles.selectedContainer}>
          {/* Preview de la imagen */}
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.changeImageButton} onPress={handleSelectImage}>
              <Ionicons name="refresh" size={20} color="#3b82f6" />
              <Text style={styles.changeImageText}>Cambiar imagen</Text>
            </TouchableOpacity>
          </View>

          {/* Pre-validación loading */}
          {state === 'pre_validating' && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Verificando calidad...</Text>
            </View>
          )}

          {/* Resultados de pre-validación */}
          {qualityCheck && state === 'selected' && (
            <View style={styles.qualityCard}>
              <Text style={styles.qualityTitle}>Verificación de calidad</Text>

              {qualityCheck.es_valido ? (
                <View style={styles.qualityValid}>
                  <Ionicons name="checkmark-circle" size={40} color="#10b981" />
                  <Text style={styles.qualityValidText}>Screenshot válido</Text>
                </View>
              ) : (
                <View style={styles.qualityInvalid}>
                  <Ionicons name="alert-circle" size={40} color="#f59e0b" />
                  <Text style={styles.qualityInvalidText}>Screenshot con problemas</Text>
                </View>
              )}

              {/* Detalles */}
              <View style={styles.qualityDetails}>
                <View style={styles.qualityItem}>
                  <Ionicons
                    name={qualityCheck.tiene_nombre_visible ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={qualityCheck.tiene_nombre_visible ? "#10b981" : "#ef4444"}
                  />
                  <Text style={styles.qualityItemText}>Nombre del lugar</Text>
                </View>

                <View style={styles.qualityItem}>
                  <Ionicons
                    name={qualityCheck.tiene_ubicacion_visible ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={qualityCheck.tiene_ubicacion_visible ? "#10b981" : "#ef4444"}
                  />
                  <Text style={styles.qualityItemText}>Ubicación etiquetada</Text>
                </View>

                <View style={styles.qualityItem}>
                  <Ionicons
                    name={qualityCheck.tiene_texto_descripcion ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={qualityCheck.tiene_texto_descripcion ? "#10b981" : "#ef4444"}
                  />
                  <Text style={styles.qualityItemText}>Descripción del post</Text>
                </View>

                <View style={styles.qualityItem}>
                  <Ionicons
                    name={qualityCheck.tiene_imagen_lugar ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={qualityCheck.tiene_imagen_lugar ? "#10b981" : "#ef4444"}
                  />
                  <Text style={styles.qualityItemText}>Imagen clara</Text>
                </View>
              </View>

              {/* Plataforma detectada */}
              {qualityCheck.plataforma_detectada && (
                <View style={styles.platformBadge}>
                  <Text style={styles.platformText}>
                    {qualityCheck.plataforma_detectada === 'instagram' ? '📸 Instagram' : '🎵 TikTok'}
                  </Text>
                </View>
              )}

              {/* Confianza */}
              <View style={styles.confidenceBar}>
                <Text style={styles.confidenceLabel}>
                  Confianza: {qualityCheck.confianza_extraccion}%
                </Text>
                <View style={styles.confidenceBarBg}>
                  <View
                    style={[
                      styles.confidenceBarFill,
                      { width: `${qualityCheck.confianza_extraccion}%` },
                    ]}
                  />
                </View>
              </View>

              {/* Sugerencias */}
              {qualityCheck.sugerencia && (
                <View style={styles.suggestionBox}>
                  <Ionicons name="bulb-outline" size={16} color="#f59e0b" />
                  <Text style={styles.suggestionText}>{qualityCheck.sugerencia}</Text>
                </View>
              )}

              {/* Problemas */}
              {qualityCheck.problemas && qualityCheck.problemas.length > 0 && (
                <View style={styles.problemsBox}>
                  <Text style={styles.problemsTitle}>Problemas detectados:</Text>
                  {qualityCheck.problemas.map((problema, index) => (
                    <Text key={index} style={styles.problemItem}>• {problema}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Botón de validar */}
          <TouchableOpacity
            style={[
              styles.validateButton,
              (!qualityCheck || !qualityCheck.es_valido) && styles.validateButtonDisabled,
            ]}
            onPress={handleValidate}
            disabled={!qualityCheck || !qualityCheck.es_valido}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color="#fff" />
            <Text style={styles.validateButtonText}>Validar Experiencia</Text>
          </TouchableOpacity>

          {!qualityCheck?.es_valido && qualityCheck && (
            <Text style={styles.warningText}>
              Puedes continuar, pero los resultados pueden ser menos precisos
            </Text>
          )}
        </ScrollView>
      )}

      {/* VALIDATING STATE */}
      {state === 'validating' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingTitle}>Analizando experiencia...</Text>
          <Text style={styles.loadingSubtitle}>Esto puede tomar 30-60 segundos</Text>

          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.stepText}>Verificando calidad</Text>
            </View>
            <View style={styles.step}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.stepText}>Identificando lugar con IA</Text>
            </View>
            <View style={styles.stepInactive}>
              <Ionicons name="ellipse-outline" size={20} color="#d1d5db" />
              <Text style={styles.stepTextInactive}>Consultando Google Places</Text>
            </View>
            <View style={styles.stepInactive}>
              <Ionicons name="ellipse-outline" size={20} color="#d1d5db" />
              <Text style={styles.stepTextInactive}>Analizando reviews</Text>
            </View>
          </View>
        </View>
      )}

      {/* ERROR STATE */}
      {state === 'error' && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
          <Text style={styles.errorTitle}>Algo salió mal</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>

          <TouchableOpacity style={styles.retryButton} onPress={handleReset}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    color: '#92400e',
    marginBottom: 4,
  },
  selectedContainer: {
    flex: 1,
    padding: 20,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'contain',
    backgroundColor: '#f3f4f6',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  changeImageText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  qualityCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  qualityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  qualityValid: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  qualityValidText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  qualityInvalid: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  qualityInvalidText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  qualityDetails: {
    gap: 12,
    marginBottom: 16,
  },
  qualityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qualityItemText: {
    fontSize: 14,
    color: '#374151',
  },
  platformBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  confidenceBar: {
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  confidenceBarBg: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  suggestionBox: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  problemsBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
  },
  problemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
  },
  problemItem: {
    fontSize: 12,
    color: '#991b1b',
    marginBottom: 4,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  validateButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 32,
  },
  stepsContainer: {
    width: '100%',
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
  },
  stepInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepTextInactive: {
    fontSize: 14,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
