/**
 * settingsStore — API key, theme, and connection state.
 * Persists to localStorage.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  apiKey: string;
  theme: 'dark' | 'light';
  isConnected: boolean;

  setApiKey: (key: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setConnected: (connected: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      theme: 'dark',
      isConnected: false,

      setApiKey: (key) => set({ apiKey: key }),
      setTheme: (theme) => set({ theme }),
      setConnected: (connected) => set({ isConnected: connected }),
    }),
    {
      name: 'shuknow-settings',
    }
  )
);
