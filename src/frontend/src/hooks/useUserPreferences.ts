import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { mapFirebaseErrorToEs } from '../utils/mapFirebaseErrorToEs';
import { useErrorNotice } from './useErrorNotice';
import { useLogger } from '../utils/logger';

export interface UserPreferences {
  interests: string[];
  location?: string;
  preferredLanguage: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  travelStyle: 'budget' | 'standard' | 'luxury' | 'backpacker';
  groupSize: 'solo' | 'couple' | 'family' | 'group';
  transportPreference: string[];
  accessibility: {
    mobilityAssistance: boolean;
    visualAssistance: boolean;
    hearingAssistance: boolean;
  };
  notifications: {
    recommendations: boolean;
    priceAlerts: boolean;
    weatherUpdates: boolean;
    eventReminders: boolean;
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  interests: [],
  preferredLanguage: 'es',
  travelStyle: 'standard',
  groupSize: 'solo',
  transportPreference: ['walking', 'public_transport'],
  accessibility: {
    mobilityAssistance: false,
    visualAssistance: false,
    hearingAssistance: false,
  },
  notifications: {
    recommendations: true,
    priceAlerts: true,
    weatherUpdates: true,
    eventReminders: true,
  },
};

const PREFERENCES_STORAGE_KEY = '@tai_user_preferences';

export const useUserPreferences = () => {
  const logger = useLogger('useUserPreferences');
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showError, showSuccess } = useErrorNotice();

  logger.debug('hook state', {
    preferencesInterests: preferences.interests,
    loading,
    userExists: !!user,
    userId: user?.uid,
    error
  });

  // Initialize preferences from storage and Firebase
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // User is authenticated, load preferences from Firebase
        await loadPreferencesFromFirebase(currentUser.uid);
      } else {
        // User is not authenticated, load from local storage
        await loadPreferencesFromStorage();
      }
    });

    return unsubscribeAuth;
  }, []);

  // Set up Firebase listener when user is authenticated
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          const firebasePrefs: UserPreferences = {
            ...DEFAULT_PREFERENCES,
            ...userData.preferences,
            interests: userData.interests || [],
          };

          setPreferences(firebasePrefs);
          // Also save to local storage as backup
          savePreferencesToStorage(firebasePrefs);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to preferences:', error);
        const errorMessage = mapFirebaseErrorToEs(error);
        setError(errorMessage);
        showError(errorMessage);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const loadPreferencesFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const parsedPrefs = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsedPrefs });
      }
    } catch (error) {
      console.error('Error loading preferences from storage:', error);
      setError('Error al cargar las preferencias locales');
    } finally {
      setLoading(false);
    }
  };

  const savePreferencesToStorage = async (prefs: UserPreferences) => {
    try {
      await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error('Error saving preferences to storage:', error);
    }
  };

  const loadPreferencesFromFirebase = async (userId: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const firebasePrefs: UserPreferences = {
          ...DEFAULT_PREFERENCES,
          ...userData.preferences,
          interests: userData.interests || [],
        };

        setPreferences(firebasePrefs);
        await savePreferencesToStorage(firebasePrefs);
      }
    } catch (error: any) {
      console.error('Error loading preferences from Firebase:', error);
      const errorMessage = mapFirebaseErrorToEs(error);
      setError(errorMessage);
      showError(errorMessage);
      // Fallback to local storage
      await loadPreferencesFromStorage();
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    logger.info('updatePreferences called', {
      updates,
      currentPreferences: preferences,
      userExists: !!user,
      userId: user?.uid
    });

    const newPreferences = { ...preferences, ...updates };
    logger.info('calculated newPreferences', { newPreferences });

    // Optimistic update
    setPreferences(newPreferences);
    logger.info('setPreferences called with newPreferences');

    try {
      // Save to local storage immediately
      logger.info('saving to local storage');
      await savePreferencesToStorage(newPreferences);
      logger.info('local storage save completed');

      // Save to Firebase if user is authenticated
      if (user) {
        logger.info('user authenticated, saving to Firebase', { userId: user.uid });
        const userDocRef = doc(db, 'users', user.uid);
        const updateData: any = {
          interests: newPreferences.interests,
        };

        // Only include preferences if they exist and are not empty
        const preferencesWithoutInterests = { ...newPreferences };
        delete preferencesWithoutInterests.interests;

        if (Object.keys(preferencesWithoutInterests).length > 0) {
          updateData.preferences = preferencesWithoutInterests;
        }

        logger.info('Firebase updateData', { updateData });
        await updateDoc(userDocRef, updateData);
        logger.info('Firebase update completed successfully');
      } else {
        logger.warn('user not authenticated, skipping Firebase save');
      }

      setError(null);
      logger.info('updatePreferences completed successfully');
    } catch (error: any) {
      logger.error('updatePreferences failed', error, { updates, newPreferences });
      const errorMessage = mapFirebaseErrorToEs(error);
      setError(errorMessage);
      showError(errorMessage);

      // Revert optimistic update
      logger.info('reverting optimistic update', { revertingTo: preferences });
      setPreferences(preferences);
      throw error;
    }
  };

  const updateInterests = async (interests: string[]) => {
    logger.info('updateInterests called', {
      interests,
      currentPreferencesInterests: preferences.interests,
      userExists: !!user,
      userId: user?.uid
    });

    try {
      logger.info('calling updatePreferences', { interests });
      await updatePreferences({ interests });
      logger.info('updatePreferences completed, showing success');
      showSuccess('Intereses guardados correctamente');
      logger.info('updateInterests completed successfully');
    } catch (error) {
      logger.error('updateInterests failed', error, { interests });
      throw error;
    }
  };

  const updateTravelStyle = async (travelStyle: UserPreferences['travelStyle']) => {
    await updatePreferences({ travelStyle });
  };

  const updateBudget = async (budget: UserPreferences['budget']) => {
    await updatePreferences({ budget });
  };

  const updateNotifications = async (notifications: Partial<UserPreferences['notifications']>) => {
    const newNotifications = { ...preferences.notifications, ...notifications };
    await updatePreferences({ notifications: newNotifications });
  };

  const updateAccessibility = async (accessibility: Partial<UserPreferences['accessibility']>) => {
    const newAccessibility = { ...preferences.accessibility, ...accessibility };
    await updatePreferences({ accessibility: newAccessibility });
  };

  const resetPreferences = async () => {
    await updatePreferences(DEFAULT_PREFERENCES);
  };

  const clearStoredPreferences = async () => {
    try {
      await AsyncStorage.removeItem(PREFERENCES_STORAGE_KEY);
      setPreferences(DEFAULT_PREFERENCES);
    } catch (error) {
      console.error('Error clearing stored preferences:', error);
    }
  };

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    updateInterests,
    updateTravelStyle,
    updateBudget,
    updateNotifications,
    updateAccessibility,
    resetPreferences,
    clearStoredPreferences,
  };
};

export default useUserPreferences;