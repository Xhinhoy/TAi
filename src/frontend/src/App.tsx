import React, { useEffect, useState } from "react";
import { LogBox } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootNav from "./navigation";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorScreen from "./components/ErrorScreen";

const client = new QueryClient();

type GlobalErrorHandler = (error: Error, isFatal?: boolean) => void;
type ErrorUtilsLike = {
  getGlobalHandler?: () => GlobalErrorHandler;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
};

type GlobalWithErrorUtils = typeof globalThis & { ErrorUtils?: ErrorUtilsLike };

export default function App() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App.tsx cargado correctamente");

    const errorUtils = (globalThis as GlobalWithErrorUtils).ErrorUtils;
    let previousHandler: GlobalErrorHandler | undefined;

    if (errorUtils?.getGlobalHandler && errorUtils.setGlobalHandler) {
      previousHandler = errorUtils.getGlobalHandler();

      errorUtils.setGlobalHandler((caughtError, isFatal) => {
        console.error("Error global capturado:", caughtError);
        setError(caughtError?.message ?? "Error desconocido");
        previousHandler?.(caughtError, isFatal);
      });
    }

    LogBox.ignoreLogs([
      "Setting a timer",
    ]);

    /*
     * En entornos Expo/React Native se deben registrar listeners usando
     * las APIs provistas por la plataforma, por ejemplo AppState,
     * DeviceEventEmitter o los manejadores globales de ErrorUtils:
     *
     * import { AppState } from "react-native";
     * const subscription = AppState.addEventListener("change", handleChange);
     * return () => subscription.remove();
     */

    return () => {
      if (errorUtils?.setGlobalHandler && previousHandler) {
        errorUtils.setGlobalHandler(previousHandler);
      }
    };
  }, []);

  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <PreferencesProvider>
          <RootNav />
        </PreferencesProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
