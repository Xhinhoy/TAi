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
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase inicializado correctamente");
} catch (error) {
  console.error("Error inicializando Firebase:", error);
  throw error;
}

export { auth, db };
