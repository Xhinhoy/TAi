import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNav from "./navigation";
import { PreferencesProvider } from "./contexts/PreferencesContext";

const client = new QueryClient();

export default function App() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App.tsx cargado correctamente");

    // Solo agregar listeners de errores en plataforma web
    if (Platform.OS === 'web') {
      const handleError = (e: ErrorEvent) => {
        console.error("Error global capturado:", e.error);
        setError(e.error?.message || "Error desconocido");
      };

      const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
        console.error("Promise rechazada sin manejar:", e.reason);
        setError(e.reason?.message || "Error en Promise");
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      // Cleanup: remover listeners cuando el componente se desmonte
      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
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
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <PreferencesProvider>
          <RootNav />
        </PreferencesProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
