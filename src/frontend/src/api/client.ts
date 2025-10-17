import axios from "axios";
import Constants from "expo-constants";
import { getAuth } from "firebase/auth";

//  Base URL del backend
const baseURL =
  (Constants.expoConfig?.extra as any)?.apiUrl || "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

//  Interceptor para adjuntar el token de Firebase en cada request
api.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      try {
        // Obtiene un token fresco (no usa caché si está expirando)
        const token = await user.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.warn("⚠️ Error al obtener token de Firebase:", error);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

//  Interceptor de respuesta para renovar token si expira (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
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
          console.warn(" Error al refrescar token:", refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);
