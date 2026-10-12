import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  topGradient: [string, string, string];
  bottomGradient: [string, string, string, string];
  dotActive: string;
  dotInactive: string;
  searchBg: string;
  searchBorder: string;
  searchText: string;
  searchPlaceholder: string;
  searchIcon: string;
}

export const lightColors: ThemeColors = {
  background: '#E0E0E0',
  card: '#FFFFFF',
  cardBorder: '#D5D5D5',
  text: '#000000',
  textSecondary: '#555555',
  topGradient: ['rgba(224, 224, 224, 0.98)', 'rgba(224, 224, 224, 0.55)', 'rgba(224, 224, 224, 0)'],
  bottomGradient: ['rgba(224, 224, 224, 0)', 'rgba(224, 224, 224, 0.35)', 'rgba(224, 224, 224, 0.85)', '#E0E0E0'],
  dotActive: '#000000',
  dotInactive: 'rgba(0, 0, 0, 0.3)',
  searchBg: '#FFFFFF',
  searchBorder: '#CCCCCC',
  searchText: '#000000',
  searchPlaceholder: '#666666',
  searchIcon: '#333333',
};

export const darkColors: ThemeColors = {
  background: '#131316',
  card: '#1C1C20',
  cardBorder: '#2A2A30',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  topGradient: ['rgba(19, 19, 22, 0.98)', 'rgba(19, 19, 22, 0.55)', 'rgba(19, 19, 22, 0)'],
  bottomGradient: ['rgba(19, 19, 22, 0)', 'rgba(19, 19, 22, 0.35)', 'rgba(19, 19, 22, 0.85)', '#131316'],
  dotActive: '#FFFFFF',
  dotInactive: 'rgba(255, 255, 255, 0.35)',
  searchBg: '#1C1C20',
  searchBorder: '#2E2E34',
  searchText: '#FFFFFF',
  searchPlaceholder: '#888888',
  searchIcon: '#AAAAAA',
};

interface ThemeState {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'user_theme_preference';

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  isDark: true,
  colors: darkColors,

  setTheme: async (mode: ThemeMode) => {
    const isDark = mode === 'dark';
    set({
      theme: mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
    });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  },

  toggleTheme: async () => {
    const nextMode: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    await get().setTheme(nextMode);
  },

  loadTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        const isDark = stored === 'dark';
        set({
          theme: stored,
          isDark,
          colors: isDark ? darkColors : lightColors,
        });
      }
    } catch (e) {
      console.warn('Failed to load theme preference', e);
    }
  },
}));
