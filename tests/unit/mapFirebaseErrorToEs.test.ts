import { mapFirebaseErrorToEs } from '../../src/frontend/src/utils/mapFirebaseErrorToEs';

describe('mapFirebaseErrorToEs', () => {
  it('debería mapear auth/email-already-in-use correctamente', () => {
    const error = { code: 'auth/email-already-in-use', message: 'The email address is already in use by another account.' };
    expect(mapFirebaseErrorToEs(error)).toBe('Este correo electrónico ya está registrado');
  });

  it('debería mapear auth/invalid-email correctamente', () => {
    const error = { code: 'auth/invalid-email', message: 'The email address is badly formatted.' };
    expect(mapFirebaseErrorToEs(error)).toBe('El correo electrónico no es válido');
  });

  it('debería mapear auth/weak-password correctamente', () => {
    const error = { code: 'auth/weak-password', message: 'Password should be at least 6 characters' };
    expect(mapFirebaseErrorToEs(error)).toBe('La contraseña es muy débil. Debe tener al menos 6 caracteres');
  });

  it('debería mapear auth/user-not-found correctamente', () => {
    const error = { code: 'auth/user-not-found', message: 'There is no user record corresponding to this identifier.' };
    expect(mapFirebaseErrorToEs(error)).toBe('No existe una cuenta con este correo electrónico');
  });

  it('debería mapear auth/wrong-password correctamente', () => {
    const error = { code: 'auth/wrong-password', message: 'The password is invalid or the user does not have a password.' };
    expect(mapFirebaseErrorToEs(error)).toBe('Contraseña incorrecta');
  });

  it('debería mapear auth/invalid-credential correctamente', () => {
    const error = { code: 'auth/invalid-credential', message: 'The supplied auth credential is malformed or has expired.' };
    expect(mapFirebaseErrorToEs(error)).toBe('Las credenciales proporcionadas son incorrectas');
  });

  it('debería mapear auth/network-request-failed correctamente', () => {
    const error = { code: 'auth/network-request-failed', message: 'A network error has occurred.' };
    expect(mapFirebaseErrorToEs(error)).toBe('Error de conexión. Verifica tu conexión a internet');
  });

  it('debería mapear auth/too-many-requests correctamente', () => {
    const error = { code: 'auth/too-many-requests', message: 'We have blocked all requests from this device due to unusual activity.' };
    expect(mapFirebaseErrorToEs(error)).toBe('Demasiados intentos fallidos. Intenta más tarde');
  });

  it('debería mapear auth/operation-not-allowed correctamente', () => {
    const error = { code: 'auth/operation-not-allowed', message: 'The given sign-in provider is disabled for this Firebase project.' };
    expect(mapFirebaseErrorToEs(error)).toBe('Esta operación no está permitida');
  });

  it('debería mapear auth/user-disabled correctamente', () => {
    const error = { code: 'auth/user-disabled', message: 'The user account has been disabled by an administrator.' };
    expect(mapFirebaseErrorToEs(error)).toBe('Esta cuenta ha sido deshabilitada');
  });

  it('debería mapear auth/requires-recent-login correctamente', () => {
    const error = { code: 'auth/requires-recent-login', message: 'This operation is sensitive and requires recent authentication.' };
    expect(mapFirebaseErrorToEs(error)).toBe('Por seguridad, necesitas iniciar sesión nuevamente');
  });

  it('debería mapear errores de Firestore correctamente', () => {
    const permissionError = { code: 'firestore/permission-denied', message: 'Missing or insufficient permissions.' };
    expect(mapFirebaseErrorToEs(permissionError)).toBe('No tienes permisos para realizar esta acción');

    const unavailableError = { code: 'firestore/unavailable', message: 'The service is currently unavailable.' };
    expect(mapFirebaseErrorToEs(unavailableError)).toBe('El servicio no está disponible temporalmente');

    const deadlineError = { code: 'firestore/deadline-exceeded', message: 'The deadline was exceeded.' };
    expect(mapFirebaseErrorToEs(deadlineError)).toBe('La operación tardó demasiado tiempo');

    const resourceError = { code: 'firestore/resource-exhausted', message: 'Resource exhausted.' };
    expect(mapFirebaseErrorToEs(resourceError)).toBe('Se han agotado los recursos disponibles');
  });

  it('debería manejar códigos de error desconocidos', () => {
    const unknownError = { code: 'unknown/error-code', message: 'Some unknown error' };
    expect(mapFirebaseErrorToEs(unknownError)).toBe('Some unknown error');
  });

  it('debería manejar errores sin mensaje', () => {
    const errorWithoutMessage = { code: 'unknown/error-code', message: '' };
    expect(mapFirebaseErrorToEs(errorWithoutMessage)).toBe('Ha ocurrido un error inesperado');
  });

  it('debería manejar errores sin código conocido pero con mensaje', () => {
    const customError = { code: 'custom/error', message: 'Mensaje de error personalizado' };
    expect(mapFirebaseErrorToEs(customError)).toBe('Mensaje de error personalizado');
  });
});