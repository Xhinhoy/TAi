import React, { createContext, useState, ReactNode, useCallback } from 'react';

export interface Notice {
  id: string;
  message: string;
  variant: 'error' | 'success' | 'info';
}

interface NoticeContextType {
  notice: Notice | null;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  clearNotice: () => void;
}

export const NoticeContext = createContext<NoticeContextType | null>(null);

interface NoticeProviderProps {
  children: ReactNode;
}

export const NoticeProvider: React.FC<NoticeProviderProps> = ({ children }) => {
  const [notice, setNotice] = useState<Notice | null>(null);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  const showNotice = useCallback((message: string, variant: Notice['variant']) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotice({ id, message, variant });

    // Auto-clear after 5 seconds for success/info
    if (variant !== 'error') {
      setTimeout(() => {
        setNotice(prev => prev?.id === id ? null : prev);
      }, 5000);
    }
  }, []);

  const showError = useCallback((message: string) => {
    showNotice(message, 'error');
  }, [showNotice]);

  const showSuccess = useCallback((message: string) => {
    showNotice(message, 'success');
  }, [showNotice]);

  const showInfo = useCallback((message: string) => {
    showNotice(message, 'info');
  }, [showNotice]);

  return (
    <NoticeContext.Provider value={{
      notice,
      showError,
      showSuccess,
      showInfo,
      clearNotice,
    }}>
      {children}
    </NoticeContext.Provider>
  );
};