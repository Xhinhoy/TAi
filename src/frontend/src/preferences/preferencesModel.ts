export interface UserPreferences {
  categories: string[];
  radiusKm: number;
  minRating: number;
}

const STORAGE_KEY = 'tai.preferences';

const defaults: UserPreferences = {
  categories: [],
  radiusKm: 10,
  minRating: 0,
};

export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error loading preferences', e);
  }
  return defaults;
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Error saving preferences', e);
  }
}
