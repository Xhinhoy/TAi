import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reviewsService } from '../services/reviews.service';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
  onReviewSubmitted?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  onClose,
  placeId,
  placeName,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    if (reviewText.trim().length < 10) {
      Alert.alert('Error', 'La reseña debe tener al menos 10 caracteres');
      return;
    }

    try {
      setSubmitting(true);

      await reviewsService.createReview({
        place_id: placeId,
        place_name: placeName,
        rating,
        text: reviewText.trim(),
      });

      Alert.alert('¡Éxito!', 'Tu reseña ha sido publicada');

      // Resetear formulario
      setRating(0);
      setReviewText('');

      // Notificar y cerrar
      onReviewSubmitted?.();
      onClose();
    } catch (error: any) {
      console.error('Error enviando reseña:', error);
      Alert.alert('Error', 'No se pudo enviar la reseña. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenGoogleMaps = () => {
    reviewsService.openGoogleMapsReview(placeId, placeName);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Escribir Reseña</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Place name */}
              <Text style={styles.placeName}>{placeName}</Text>

              {/* Rating Stars */}
              <View style={styles.ratingContainer}>
                <Text style={styles.label}>Calificación</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starButton}
                    >
                      <MaterialCommunityIcons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={40}
                        color={star <= rating ? '#FFD700' : '#ccc'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Review Text */}
              <View style={styles.textContainer}>
                <Text style={styles.label}>Tu reseña</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Comparte tu experiencia..."
                  multiline
                  numberOfLines={6}
                  maxLength={1000}
                  value={reviewText}
                  onChangeText={setReviewText}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{reviewText.length}/1000</Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Enviando...' : 'Publicar Reseña'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>O</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Maps Button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleOpenGoogleMaps}
              >
                <MaterialCommunityIcons name="google-maps" size={20} color="#4285F4" />
                <Text style={styles.googleButtonText}>
                  Escribir en Google Maps
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  placeName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  ratingContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  starButton: {
    padding: 5,
  },
  textContainer: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    backgroundColor: '#f9f9f9',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4285F4',
    backgroundColor: 'white',
    gap: 8,
  },
  googleButtonText: {
    color: '#4285F4',
    fontSize: 15,
    fontWeight: '600',
  },
});
