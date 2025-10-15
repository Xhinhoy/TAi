import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootNav from "./navigation";
import { PreferencesProvider } from "./contexts/PreferencesContext";

const client = new QueryClient();

export default function App() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App.tsx cargado correctamente");

    // Verificar si hay errores en el proceso de carga
    window.addEventListener('error', (e) => {
      console.error("Error global capturado:", e.error);
      setError(e.error?.message || "Error desconocido");
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error("Promise rechazada sin manejar:", e.reason);
      setError(e.reason?.message || "Error en Promise");
    });
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: 'red' }}>
          Error al cargar la aplicación
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#666' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={client}>
      <PreferencesProvider>
        <RootNav />
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
