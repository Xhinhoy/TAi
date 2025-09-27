import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootNav from "./navigation";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { NoticeProvider } from "./contexts/NoticeContext";
import { ErrorNotice } from "./components/ui/ErrorNotice";
import { useErrorNotice } from "./hooks/useErrorNotice";

const client = new QueryClient();

const AppContent = () => {
  const { notice, clearNotice } = useErrorNotice();

  return (
    <>
      <RootNav />
      {notice && (
        <ErrorNotice
          message={notice.message}
          variant={notice.variant}
          onClose={clearNotice}
          testID="global-notice"
        />
      )}
    </>
  );
};

export default function App() {
  useEffect(() => {
    console.log("App.tsx cargado correctamente");
  }, []);

  return (
    <QueryClientProvider client={client}>
      <NoticeProvider>
        <PreferencesProvider>
          <AppContent />
        </PreferencesProvider>
      </NoticeProvider>
    </QueryClientProvider>
  );
}
