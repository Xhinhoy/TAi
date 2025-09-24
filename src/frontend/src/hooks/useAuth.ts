import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../services/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  return { user, loading };
}
