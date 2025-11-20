interface FirebaseError {
  code: string;
  message: string;
}

export const mapFirebaseErrorToEs = (error: FirebaseError): string => {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Este correo electrónico ya está registrado';
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido';
    case 'auth/weak-password':
      return 'La contraseña es muy débil. Debe tener al menos 6 caracteres';
    case 'auth/user-not-found':
      return 'No existe una cuenta con este correo electrónico';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta';
    case 'auth/invalid-credential':
      return 'Las credenciales proporcionadas son incorrectas';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu conexión a internet';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Intenta más tarde';
    case 'auth/operation-not-allowed':
      return 'Esta operación no está permitida';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada';
    case 'auth/requires-recent-login':
      return 'Por seguridad, necesitas iniciar sesión nuevamente';
    case 'firestore/permission-denied':
      return 'No tienes permisos para realizar esta acción';
    case 'firestore/unavailable':
      return 'El servicio no está disponible temporalmente';
    case 'firestore/deadline-exceeded':
      return 'La operación tardó demasiado tiempo';
    case 'firestore/resource-exhausted':
      return 'Se han agotado los recursos disponibles';
    default:
      return error.message || 'Ha ocurrido un error inesperado';
  }
};