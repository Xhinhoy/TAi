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

// Evita inicializar varias veces en hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
