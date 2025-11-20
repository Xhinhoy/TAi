// src/services/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHbDoCNtcZM6aa8tHvnT4LwMUPjeLg77w",
  authDomain: "proyectotai-cb31a.firebaseapp.com",
  projectId: "proyectotai-cb31a",
  storageBucket: "proyectotai-cb31a.firebasestorage.app",
  messagingSenderId: "246782162173",
  appId: "1:246782162173:web:671c430045f43c0c2e3a94",
  measurementId: "G-GVFPPMC6VD"
};

let app;
let auth;
let db;

try {
  console.log("Inicializando Firebase...");

  // Evita inicializar varias veces en hot-reload
  const isFirstInit = getApps().length === 0;
  app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

  // Firebase Auth con persistencia automática
  // En Firebase v10+, la persistencia es automática en React Native
  // cuando AsyncStorage está instalado (indexedDB en web)
  auth = getAuth(app);
  console.log("✅ Firebase Auth inicializado");

  db = getFirestore(app);
  console.log("✅ Firebase inicializado correctamente");
} catch (error) {
  console.error("❌ Error inicializando Firebase:", error);
  throw error;
}

export { auth, db };
