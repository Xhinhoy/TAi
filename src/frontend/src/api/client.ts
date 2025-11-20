import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getAuth } from "firebase/auth";

// Base URL del backend
// Para Android en emulador: usa la IP de tu computadora en la red local
// Para obtener tu IP: ejecuta 'ipconfig' en Windows (busca IPv4 de WiFi/Ethernet)
const getBaseURL = () => {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as any)?.apiUrl ||
    "http://localhost:8000/api/v1";

  console.log('🔧 Platform:', Platform.OS);
  console.log('🔧 Configured URL:', configuredUrl);

  // Si es Android y usa localhost, usar IP de desarrollo
  if (Platform.OS === 'android' && configuredUrl.includes('localhost')) {
    // Obtener la IP del manifest de Expo (si está disponible)
    const expoDevServerUrl = Constants.expoConfig?.hostUri;

    if (expoDevServerUrl) {
      // Extraer solo la IP (sin el puerto de Expo)
      const devServerIP = expoDevServerUrl.split(':')[0];
      const androidUrl = configuredUrl.replace('localhost', devServerIP);
      console.log('🤖 Android detected - Using Expo dev server IP:', devServerIP);
      console.log('🤖 Android URL:', androidUrl);
      return androidUrl;
    } else {
      // Si no hay hostUri, mantener localhost (usuario debe configurar .env)
      console.log('⚠️  No se pudo obtener la IP del servidor Expo');
      console.log('⚠️  Actualiza EXPO_PUBLIC_API_URL en .env con tu IP local (ej: http://192.168.100.9:8000/api/v1)');
      return configuredUrl;
    }
  }

  return configuredUrl;
};

const baseURL = getBaseURL();
console.log(`📡 Final API Base URL: ${baseURL}`);

export const api = axios.create({
  baseURL,
  timeout: 60000, // 60s para dev/mock
  headers: {
    "Content-Type": "application/json",
  },
});

//  Interceptor para adjuntar el token de Firebase en cada request
api.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;

    console.log('🔐 Request interceptor:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      hasUser: !!user,
      userEmail: user?.email,
    });

    if (user) {
      try {
        // Obtiene un token fresco (no usa caché si está expirando)
        const token = await user.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Token agregado:', token.substring(0, 20) + '...');
      } catch (error) {
        console.warn("⚠️ Error al obtener token de Firebase:", error);
      }
    } else {
      console.warn("⚠️ No hay usuario autenticado, request sin token");
    }

    return config;
  },
  (error) => Promise.reject(error)
);

//  Interceptor de respuesta para renovar token si expira (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log detallado de errores de red
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Request timeout - El servidor no respondió a tiempo');
    } else if (error.message === 'Network Error') {
      console.error('❌ Network Error - No se puede conectar al servidor');
      console.error('   Verifica que el backend esté corriendo en:', baseURL);
      console.error('   En Android, asegúrate de que el backend esté accesible desde el emulador');
    } else if (error.response) {
      console.error(`❌ Server error: ${error.response.status}`, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }

    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        try {
          const token = await user.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api.request(originalRequest);
        } catch (refreshError) {
          console.warn("⚠️ Error al refrescar token:", refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);
