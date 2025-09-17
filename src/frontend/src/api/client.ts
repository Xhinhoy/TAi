import axios from "axios";
import Constants from "expo-constants";
import { getAuth } from "firebase/auth";
const baseURL = (Constants.expoConfig?.extra as any)?.apiUrl;
export const api = axios.create({ baseURL });
api.interceptors.request.use(async (config) => {
  const token = await getAuth().currentUser?.getIdToken?.();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
