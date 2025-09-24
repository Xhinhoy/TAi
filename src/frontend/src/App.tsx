import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootNav from "./navigation";

const client = new QueryClient();

export default function App() {
  useEffect(() => {
    console.log("App.tsx cargado correctamente");
  }, []);

  return (
    <QueryClientProvider client={client}>
      <RootNav />
    </QueryClientProvider>
  );
}
