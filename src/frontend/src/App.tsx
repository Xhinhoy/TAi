import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootNav from "./navigation";
import { PreferencesProvider } from "./contexts/PreferencesContext";

const client = new QueryClient();

export default function App() {
  useEffect(() => {
    console.log("App.tsx cargado correctamente");
  }, []);

  return (
    <QueryClientProvider client={client}>
      <PreferencesProvider>
        <RootNav />
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
