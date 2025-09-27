import { renderHook, act } from '@testing-library/react-native';
import { useUserPreferences } from '../../src/frontend/src/hooks/useUserPreferences';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock Firebase services
jest.mock('../../src/frontend/src/services/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock error notice hook
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock('../../src/frontend/src/hooks/useErrorNotice', () => ({
  useErrorNotice: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
  }),
}));

describe('useUserPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería inicializar con valores por defecto', () => {
    const { result } = renderHook(() => useUserPreferences());

    expect(result.current.preferences).toEqual({
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
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('debería actualizar intereses correctamente', async () => {
    const { result } = renderHook(() => useUserPreferences());

    const newInterests = ['museos', 'restaurantes', 'parques'];

    await act(async () => {
      await result.current.updateInterests(newInterests);
    });

    expect(result.current.preferences.interests).toEqual(newInterests);
    expect(mockShowSuccess).toHaveBeenCalledWith('Intereses guardados correctamente');
  });

  it('debería manejar errores al actualizar intereses', async () => {
    // Mock updateDoc to throw an error
    const { updateDoc } = require('firebase/firestore');
    updateDoc.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useUserPreferences());

    const newInterests = ['museos', 'restaurantes'];

    await act(async () => {
      try {
        await result.current.updateInterests(newInterests);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(mockShowError).toHaveBeenCalled();
  });

  it('debería actualizar estilo de viaje', async () => {
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      await result.current.updateTravelStyle('luxury');
    });

    expect(result.current.preferences.travelStyle).toBe('luxury');
  });

  it('debería actualizar presupuesto', async () => {
    const { result } = renderHook(() => useUserPreferences());

    const budget = { min: 100, max: 500, currency: 'CLP' };

    await act(async () => {
      await result.current.updateBudget(budget);
    });

    expect(result.current.preferences.budget).toEqual(budget);
  });

  it('debería actualizar notificaciones parcialmente', async () => {
    const { result } = renderHook(() => useUserPreferences());

    const updatedNotifications = { recommendations: false };

    await act(async () => {
      await result.current.updateNotifications(updatedNotifications);
    });

    expect(result.current.preferences.notifications).toEqual({
      recommendations: false,
      priceAlerts: true,
      weatherUpdates: true,
      eventReminders: true,
    });
  });

  it('debería actualizar accesibilidad parcialmente', async () => {
    const { result } = renderHook(() => useUserPreferences());

    const updatedAccessibility = { mobilityAssistance: true };

    await act(async () => {
      await result.current.updateAccessibility(updatedAccessibility);
    });

    expect(result.current.preferences.accessibility).toEqual({
      mobilityAssistance: true,
      visualAssistance: false,
      hearingAssistance: false,
    });
  });

  it('debería resetear preferencias a valores por defecto', async () => {
    const { result } = renderHook(() => useUserPreferences());

    // Primero modificar algunas preferencias
    await act(async () => {
      await result.current.updateInterests(['museos']);
      await result.current.updateTravelStyle('luxury');
    });

    // Luego resetear
    await act(async () => {
      await result.current.resetPreferences();
    });

    expect(result.current.preferences.interests).toEqual([]);
    expect(result.current.preferences.travelStyle).toBe('standard');
  });

  it('debería limpiar preferencias almacenadas localmente', async () => {
    const { removeItem } = require('@react-native-async-storage/async-storage');
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      await result.current.clearStoredPreferences();
    });

    expect(removeItem).toHaveBeenCalledWith('@tai_user_preferences');
  });
});