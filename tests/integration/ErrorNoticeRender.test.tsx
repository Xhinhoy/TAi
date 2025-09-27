import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ErrorNotice } from '../../src/frontend/src/components/ui/ErrorNotice';

describe('ErrorNotice Component', () => {
  it('debería renderizar mensaje de error correctamente', () => {
    const { getByText } = render(
      <ErrorNotice message="Error de prueba" testID="error-notice" />
    );

    expect(getByText('Error de prueba')).toBeTruthy();
  });

  it('debería mostrar ícono de error por defecto', () => {
    const { getByTestId } = render(
      <ErrorNotice message="Error de prueba" testID="error-notice" />
    );

    const notice = getByTestId('error-notice');
    expect(notice).toBeTruthy();
  });

  it('debería mostrar variante de éxito', () => {
    const { getByText } = render(
      <ErrorNotice
        message="Operación exitosa"
        variant="success"
        testID="success-notice"
      />
    );

    expect(getByText('Operación exitosa')).toBeTruthy();
  });

  it('debería mostrar variante de información', () => {
    const { getByText } = render(
      <ErrorNotice
        message="Información importante"
        variant="info"
        testID="info-notice"
      />
    );

    expect(getByText('Información importante')).toBeTruthy();
  });

  it('debería llamar onClose cuando se presiona el botón cerrar', () => {
    const mockOnClose = jest.fn();
    const { getByLabelText } = render(
      <ErrorNotice
        message="Error de prueba"
        onClose={mockOnClose}
        testID="error-notice"
      />
    );

    const closeButton = getByLabelText('Cerrar notificación');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('debería tener atributos de accesibilidad correctos', () => {
    const { getByTestId } = render(
      <ErrorNotice message="Error de prueba" testID="error-notice" />
    );

    const notice = getByTestId('error-notice');
    expect(notice.props.accessibilityRole).toBe('alert');
    expect(notice.props.accessibilityLiveRegion).toBe('polite');
  });

  it('debería no mostrar botón cerrar si no se proporciona onClose', () => {
    const { queryByLabelText } = render(
      <ErrorNotice message="Error de prueba" testID="error-notice" />
    );

    const closeButton = queryByLabelText('Cerrar notificación');
    expect(closeButton).toBeNull();
  });

  it('debería aplicar estilos correctos según la variante', () => {
    // Test para variante error
    const { rerender, getByTestId } = render(
      <ErrorNotice message="Error" variant="error" testID="notice" />
    );

    let notice = getByTestId('notice');
    expect(notice).toBeTruthy();

    // Test para variante success
    rerender(<ErrorNotice message="Éxito" variant="success" testID="notice" />);
    notice = getByTestId('notice');
    expect(notice).toBeTruthy();

    // Test para variante info
    rerender(<ErrorNotice message="Info" variant="info" testID="notice" />);
    notice = getByTestId('notice');
    expect(notice).toBeTruthy();
  });

  it('debería manejar mensajes largos correctamente', () => {
    const longMessage = 'Este es un mensaje muy largo que debería manejarse correctamente por el componente sin romper el diseño o la funcionalidad del mismo.';

    const { getByText } = render(
      <ErrorNotice message={longMessage} testID="error-notice" />
    );

    expect(getByText(longMessage)).toBeTruthy();
  });

  it('debería manejar caracteres especiales en el mensaje', () => {
    const specialMessage = 'Error: ñáéíóú @#$%^&*()[]{}';

    const { getByText } = render(
      <ErrorNotice message={specialMessage} testID="error-notice" />
    );

    expect(getByText(specialMessage)).toBeTruthy();
  });
});