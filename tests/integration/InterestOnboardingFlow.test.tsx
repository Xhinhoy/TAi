import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import InterestOnboarding from '../../src/frontend/src/screens/Onboarding/InterestOnboarding';
import { NoticeProvider } from '../../src/frontend/src/contexts/NoticeContext';
import { PreferencesProvider } from '../../src/frontend/src/contexts/PreferencesContext';

// Mock del hook useAuth
const mockUser = { uid: 'test-uid', email: 'test@test.com' };
jest.mock('../../src/frontend/src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock de react-navigation
const mockReset = jest.fn();
const mockNavigation = {
  reset: mockReset,
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock de usePreferences
const mockUpdateInterests = jest.fn();
const mockPreferences = {
  interests: [],
  preferredLanguage: 'es',
  travelStyle: 'standard',
  groupSize: 'solo',
  transportPreference: ['walking'],
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

// Wrapper con providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NoticeProvider>
    <PreferencesProvider>
      {children}
    </PreferencesProvider>
  </NoticeProvider>
);

// Mock de usePreferences dentro del wrapper
jest.mock('../../src/frontend/src/contexts/PreferencesContext', () => ({
  usePreferences: () => ({
    preferences: mockPreferences,
    updateInterests: mockUpdateInterests,
    loading: false,
    error: null,
  }),
  PreferencesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('InterestOnboarding Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar correctamente la pantalla de onboarding', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('¿Qué te interesa?')).toBeTruthy();
    expect(getByText(/Elige al menos 3 para personalizar/)).toBeTruthy();
    expect(getByTestId('onboarding-interest-selector')).toBeTruthy();
    expect(getByTestId('continue-button')).toBeTruthy();
  });

  it('debería mostrar contador de intereses seleccionados', () => {
    const { getByText } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText(/Seleccionados: 0/)).toBeTruthy();
  });

  it('debería deshabilitar botón continuar si se seleccionan menos de 3 intereses', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    const continueButton = getByTestId('continue-button');
    expect(continueButton.props.accessibilityState.disabled).toBe(true);
  });

  it('debería permitir seleccionar intereses', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    // Seleccionar algunos intereses
    const museosInterest = getByTestId('interest-museos');
    const restaurantesInterest = getByTestId('interest-restaurantes');
    const parquesInterest = getByTestId('interest-parques');

    fireEvent.press(museosInterest);
    fireEvent.press(restaurantesInterest);
    fireEvent.press(parquesInterest);

    await waitFor(() => {
      const continueButton = getByTestId('continue-button');
      expect(continueButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  it('debería llamar updateInterests al continuar', async () => {
    mockUpdateInterests.mockResolvedValueOnce(undefined);

    const { getByTestId } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    // Seleccionar 3 intereses
    const museosInterest = getByTestId('interest-museos');
    const restaurantesInterest = getByTestId('interest-restaurantes');
    const parquesInterest = getByTestId('interest-parques');

    fireEvent.press(museosInterest);
    fireEvent.press(restaurantesInterest);
    fireEvent.press(parquesInterest);

    const continueButton = getByTestId('continue-button');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(mockUpdateInterests).toHaveBeenCalledWith(['museos', 'restaurantes', 'parques']);
    });
  });

  it('debería navegar a MainTabs después de guardar', async () => {
    mockUpdateInterests.mockResolvedValueOnce(undefined);

    const { getByTestId } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    // Seleccionar 3 intereses
    const museosInterest = getByTestId('interest-museos');
    const restaurantesInterest = getByTestId('interest-restaurantes');
    const parquesInterest = getByTestId('interest-parques');

    fireEvent.press(museosInterest);
    fireEvent.press(restaurantesInterest);
    fireEvent.press(parquesInterest);

    const continueButton = getByTestId('continue-button');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    });
  });

  it('debería manejar errores al guardar intereses', async () => {
    const error = new Error('Error al guardar');
    mockUpdateInterests.mockRejectedValueOnce(error);

    const { getByTestId } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    // Seleccionar 3 intereses
    const museosInterest = getByTestId('interest-museos');
    const restaurantesInterest = getByTestId('interest-restaurantes');
    const parquesInterest = getByTestId('interest-parques');

    fireEvent.press(museosInterest);
    fireEvent.press(restaurantesInterest);
    fireEvent.press(parquesInterest);

    const continueButton = getByTestId('continue-button');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(mockUpdateInterests).toHaveBeenCalled();
      // No debería navegar si hay error
      expect(mockReset).not.toHaveBeenCalled();
    });
  });

  it('debería mostrar loading cuando está guardando', async () => {
    // Mock que no se resuelve inmediatamente
    let resolvePromise: (value?: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockUpdateInterests.mockReturnValueOnce(pendingPromise);

    const { getByTestId, getByText } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    // Seleccionar 3 intereses
    const museosInterest = getByTestId('interest-museos');
    const restaurantesInterest = getByTestId('interest-restaurantes');
    const parquesInterest = getByTestId('interest-parques');

    fireEvent.press(museosInterest);
    fireEvent.press(restaurantesInterest);
    fireEvent.press(parquesInterest);

    const continueButton = getByTestId('continue-button');
    fireEvent.press(continueButton);

    // Debería mostrar loading
    await waitFor(() => {
      expect(continueButton.props.accessibilityState.disabled).toBe(true);
    });

    // Resolver la promesa
    resolvePromise!();

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
    });
  });

  it('debería permitir deseleccionar intereses', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    const museosInterest = getByTestId('interest-museos');

    // Seleccionar
    fireEvent.press(museosInterest);
    await waitFor(() => {
      expect(getByText(/Seleccionados: 1/)).toBeTruthy();
    });

    // Deseleccionar
    fireEvent.press(museosInterest);
    await waitFor(() => {
      expect(getByText(/Seleccionados: 0/)).toBeTruthy();
    });
  });

  it('debería cargar intereses existentes del usuario', () => {
    // Mock con intereses existentes
    const mockPreferencesWithInterests = {
      ...mockPreferences,
      interests: ['museos', 'restaurantes'],
    };

    jest.mocked(require('../../src/frontend/src/contexts/PreferencesContext').usePreferences).mockReturnValueOnce({
      preferences: mockPreferencesWithInterests,
      updateInterests: mockUpdateInterests,
      loading: false,
      error: null,
    });

    const { getByText } = render(
      <TestWrapper>
        <InterestOnboarding navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText(/Seleccionados: 2/)).toBeTruthy();
  });
});