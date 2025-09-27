import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from "firebase/auth";
import { auth, createUserProfile } from "../services/firebase";
import { mapFirebaseErrorToEs } from "../utils/mapFirebaseErrorToEs";
import { useErrorNotice } from "./useErrorNotice";

interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

interface AuthError {
  code: string;
  message: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showError } = useErrorNotice();

  useEffect(() => {
    console.log("useAuth: suscribiendo a Firebase Auth...");
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Estado de autenticación cambió:", firebaseUser);
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      console.log("useAuth: limpiando suscripción a Firebase Auth");
      unsub();
    };
  }, []);

  const signUpWithEmail = async ({ email, password, displayName }: SignUpData) => {
    try {
      setLoading(true);
      setError(null);

      // Crear usuario con email y contraseña
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Actualizar perfil con displayName si se proporciona
      if (displayName?.trim()) {
        await updateProfile(user, {
          displayName: displayName.trim()
        });
      }

      // Crear perfil en Firestore
      await createUserProfile(user, { displayName: displayName?.trim() });

      console.log("Usuario registrado exitosamente:", user.uid);
      return user;
    } catch (error: any) {
      const errorMessage = mapFirebaseErrorToEs(error);
      setError(errorMessage);
      showError(errorMessage);
      console.error("Error en registro:", error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Usuario autenticado:", userCredential.user.uid);
      return userCredential.user;
    } catch (error: any) {
      const errorMessage = mapFirebaseErrorToEs(error);
      setError(errorMessage);
      showError(errorMessage);
      console.error("Error en login:", error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await firebaseSignOut(auth);
      console.log("Usuario desconectado");
    } catch (error: any) {
      const errorMessage = mapFirebaseErrorToEs(error);
      setError(errorMessage);
      showError(errorMessage);
      console.error("Error al cerrar sesión:", error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signUpWithEmail,
    signInWithEmail,
    signOut
  };
}

