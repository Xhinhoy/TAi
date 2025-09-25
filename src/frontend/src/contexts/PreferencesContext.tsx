import React, { createContext, useContext, ReactNode } from 'react';
import { useUserPreferences, UserPreferences } from '../hooks/useUserPreferences';

interface PreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updateInterests: (interests: string[]) => Promise<void>;
  updateTravelStyle: (travelStyle: UserPreferences['travelStyle']) => Promise<void>;
  updateBudget: (budget: UserPreferences['budget']) => Promise<void>;
  updateNotifications: (notifications: Partial<UserPreferences['notifications']>) => Promise<void>;
  updateAccessibility: (accessibility: Partial<UserPreferences['accessibility']>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  clearStoredPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const preferencesHook = useUserPreferences();

  return (
    <PreferencesContext.Provider value={preferencesHook}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

export default PreferencesProvider;