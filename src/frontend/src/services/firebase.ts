// src/services/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAHbDoCNtcZM6aa8tHvnT4LwMUPjeLg77w",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "proyectotai-cb31a.firebaseapp.com",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "proyectotai-cb31a",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "proyectotai-cb31a.firebasestorage.app",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "246782162173",
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:246782162173:web:671c430045f43c0c2e3a94",
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-GVFPPMC6VD"
};

// Evita inicializar varias veces en hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// Bootstrap de perfil de usuario en Firestore
export const createUserProfile = async (user: any, additionalData: any = {}) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);

  try {
    const userData = {
      displayName: (additionalData.displayName || user.displayName || '').trim(),
      email: user.email,
      role: 'user',
      status: 'active',
      createdAt: serverTimestamp(),
      interests: [],
      preferences: {
        notifications: true,
        language: 'es',
      },
      ...additionalData
    };

    // Operación idempotente - solo crea si no existe
    await setDoc(userRef, userData, { merge: true });

    console.log('Perfil de usuario creado/actualizado en Firestore');
    return userData;
  } catch (error) {
    console.error('Error al crear perfil de usuario:', error);
    throw error;
  }
};
