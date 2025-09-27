import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Register from '../../src/frontend/src/screens/Auth/Register';

// Mock del hook useAuth
const mockSignUpWithEmail = jest.fn();
jest.mock('../../src/frontend/src/hooks/useAuth', () => ({
  useAuth: () => ({
    signUpWithEmail: mockSignUpWithEmail,
    loading: false,
  }),
}));

// Mock de react-navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  reset: jest.fn(),
  goBack: jest.fn(),
};

// Mock de Alert
jest.spyOn(Alert, 'alert');

describe('Pantalla de Registro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar todos los campos del formulario', () => {
    const { getByLabelText, getByText } = render(
      <Register navigation={mockNavigation} />
    );

    expect(getByLabelText('Campo de nombre completo')).toBeTruthy();
    expect(getByLabelText('Campo de correo electrónico')).toBeTruthy();
    expect(getByLabelText('Campo de contraseña')).toBeTruthy();
    expect(getByLabelText('Campo de confirmación de contraseña')).toBeTruthy();
    expect(getByLabelText('Aceptar términos y condiciones')).toBeTruthy();
    expect(getByText('Crear cuenta')).toBeTruthy();
  });

  it('debería mostrar errores de validación con datos inválidos', async () => {
    const { getByLabelText, getByText, getByTestId } = render(
      <Register navigation={mockNavigation} />
    );

    const emailInput = getByLabelText('Campo de correo electrónico');
    const passwordInput = getByLabelText('Campo de contraseña');
    const confirmPasswordInput = getByLabelText('Campo de confirmación de contraseña');
    const submitButton = getByText('Crear cuenta');

    // Llenar con datos inválidos
    fireEvent.changeText(emailInput, 'email-invalido');
    fireEvent.changeText(passwordInput, '123');
    fireEvent.changeText(confirmPasswordInput, '456');

    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('El correo electrónico no es válido')).toBeTruthy();
      expect(getByText('La contraseña debe tener al menos 8 caracteres')).toBeTruthy();
    });
  });

  it('debería mostrar medidor de fuerza de contraseña', async () => {
    const { getByLabelText, getByText } = render(
      <Register navigation={mockNavigation} />
    );

    const passwordInput = getByLabelText('Campo de contraseña');

    fireEvent.changeText(passwordInput, 'password');

    await waitFor(() => {
      expect(getByText('Débil')).toBeTruthy();
    });

    fireEvent.changeText(passwordInput, 'Password123!');

    await waitFor(() => {
      expect(getByText('Muy fuerte')).toBeTruthy();
    });
  });

  it('debería deshabilitar botón si no acepta términos', () => {
    const { getByText } = render(
      <Register navigation={mockNavigation} />
    );

    const submitButton = getByText('Crear cuenta');
    expect(submitButton.props.accessibilityState.disabled).toBe(true);
  });

  it('debería habilitar botón cuando acepta términos y datos son válidos', async () => {
    const { getByLabelText, getByText } = render(
      <Register navigation={mockNavigation} />
    );

    const emailInput = getByLabelText('Campo de correo electrónico');
    const passwordInput = getByLabelText('Campo de contraseña');
    const confirmPasswordInput = getByLabelText('Campo de confirmación de contraseña');
    const termsCheckbox = getByLabelText('Aceptar términos y condiciones');
    const submitButton = getByText('Crear cuenta');

    // Llenar formulario con datos válidos
    fireEvent.changeText(emailInput, 'test@ejemplo.com');
    fireEvent.changeText(passwordInput, 'Password123!');
    fireEvent.changeText(confirmPasswordInput, 'Password123!');
    fireEvent.press(termsCheckbox);

    await waitFor(() => {
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  it('debería llamar signUpWithEmail con datos correctos', async () => {
    mockSignUpWithEmail.mockResolvedValueOnce({
      uid: 'test-uid',
      email: 'test@ejemplo.com',
    });

    const { getByLabelText, getByText } = render(
      <Register navigation={mockNavigation} />
    );

    const nameInput = getByLabelText('Campo de nombre completo');
    const emailInput = getByLabelText('Campo de correo electrónico');
    const passwordInput = getByLabelText('Campo de contraseña');
    const confirmPasswordInput = getByLabelText('Campo de confirmación de contraseña');
    const termsCheckbox = getByLabelText('Aceptar términos y condiciones');
    const submitButton = getByText('Crear cuenta');

    // Llenar formulario
    fireEvent.changeText(nameInput, 'Juan Pérez');
    fireEvent.changeText(emailInput, 'test@ejemplo.com');
    fireEvent.changeText(passwordInput, 'Password123!');
    fireEvent.changeText(confirmPasswordInput, 'Password123!');
    fireEvent.press(termsCheckbox);

    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockSignUpWithEmail).toHaveBeenCalledWith({
        email: 'test@ejemplo.com',
        password: 'Password123!',
        displayName: 'Juan Pérez',
      });
    });
  });

  it('debería mostrar alert de éxito tras registro exitoso', async () => {
    mockSignUpWithEmail.mockResolvedValueOnce({
      uid: 'test-uid',
      email: 'test@ejemplo.com',
    });

    const { getByLabelText, getByText } = render(
      <Register navigation={mockNavigation} />
    );

    const emailInput = getByLabelText('Campo de correo electrónico');
    const passwordInput = getByLabelText('Campo de contraseña');
    const confirmPasswordInput = getByLabelText('Campo de confirmación de contraseña');
    const termsCheckbox = getByLabelText('Aceptar términos y condiciones');
    const submitButton = getByText('Crear cuenta');

    fireEvent.changeText(emailInput, 'test@ejemplo.com');
    fireEvent.changeText(passwordInput, 'Password123!');
    fireEvent.changeText(confirmPasswordInput, 'Password123!');
    fireEvent.press(termsCheckbox);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Registro exitoso',
        expect.stringContaining('¡Bienvenido'),
        expect.any(Array)
      );
    });
  });

  it('debería mostrar alert de error si falla el registro', async () => {
    const errorMessage = 'Este correo electrónico ya está registrado';
    mockSignUpWithEmail.mockRejectedValueOnce(new Error(errorMessage));

    const { getByLabelText, getByText } = render(
      <Register navigation={mockNavigation} />
    );

    const emailInput = getByLabelText('Campo de correo electrónico');
    const passwordInput = getByLabelText('Campo de contraseña');
    const confirmPasswordInput = getByLabelText('Campo de confirmación de contraseña');
    const termsCheckbox = getByLabelText('Aceptar términos y condiciones');
    const submitButton = getByText('Crear cuenta');

    fireEvent.changeText(emailInput, 'existing@ejemplo.com');
    fireEvent.changeText(passwordInput, 'Password123!');
    fireEvent.changeText(confirmPasswordInput, 'Password123!');
    fireEvent.press(termsCheckbox);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error al registrar',
        errorMessage
      );
    });
  });

  it('debería navegar a Login cuando se presiona el enlace', () => {
    const { getByText } = render(
      <Register navigation={mockNavigation} />
    );

    const loginLink = getByText('Inicia sesión aquí');
    fireEvent.press(loginLink);

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('debería alternar visibilidad de contraseña', () => {
    const { getByLabelText } = render(
      <Register navigation={mockNavigation} />
    );

    const passwordInput = getByLabelText('Campo de contraseña');
    const toggleButton = passwordInput.parent?.findByProps({
      accessibilityLabel: 'Acción del campo'
    });

    expect(passwordInput.props.secureTextEntry).toBe(true);

    if (toggleButton) {
      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(false);
    }
  });
});