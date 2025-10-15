import axios from "axios";
import Constants from "expo-constants";
import { getAuth } from "firebase/auth";

const baseURL = (Constants.expoConfig?.extra as any)?.apiUrl || "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getAuth().currentUser?.getIdToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const user = getAuth().currentUser;
      if (user) {
        const token = await user.getIdToken(true);
        error.config.headers.Authorization = `Bearer ${token}`;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);
