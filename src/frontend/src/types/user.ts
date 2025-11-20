import { Timestamp } from "firebase/firestore";

export type NotificationsPrefs = {
  recommendations: boolean;
  priceAlerts: boolean;
  weatherUpdates: boolean;
  eventReminders: boolean;
};

export type AccessibilityPrefs = {
  visualAssistance: boolean;
  hearingAssistance: boolean;
  mobilityAssistance: boolean;
};

export type Preferences = {
  preferredLanguage: "es" | "en";
  travelStyle: "standard" | "budget" | "luxury";
  groupSize: "solo" | "couple" | "group";
  transportPreference: string[];
  accessibility: AccessibilityPrefs;
  notifications: NotificationsPrefs;
  budget?: { min?: number; max?: number; currency?: string } | null;
};

export type UserProfileDoc = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  location: string;              // ej. "Santiago"
  language: "es" | "en";
  timezone: string;              // IANA, ej. "America/Santiago"
  interests: string[];           // ids del InterestSelector
  preferences: Preferences;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
