/**
 * Hook para seleccionar imágenes de la galería o cámara
 */

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export function useImagePicker() {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a tu galería para seleccionar screenshots.'
      );
      return false;
    }
    return true;
  };

  const pickFromGallery = async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setIsLoading(false);
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16], // Formato vertical típico de screenshots de redes sociales
        quality: 1,
      });

      setIsLoading(false);

      if (result.canceled) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      setIsLoading(false);
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
      return null;
    }
  };

  const takePhoto = async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu cámara para tomar fotos.'
        );
        setIsLoading(false);
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [9, 16],
        quality: 1,
      });

      setIsLoading(false);

      if (result.canceled) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      setIsLoading(false);
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
      return null;
    }
  };

  return {
    pickFromGallery,
    takePhoto,
    isLoading,
  };
}
