import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const SETTINGS_VERSION = 1;

type SettingsState = {
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  /** Força movimento reduzido mesmo quando o sistema não pede (§5.6). */
  forceReducedMotion: boolean;

  toggleHaptics: () => void;
  toggleSound: () => void;
  toggleReducedMotion: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      hapticsEnabled: true,
      soundEnabled: true,
      forceReducedMotion: false,

      toggleHaptics: () => set({ hapticsEnabled: !get().hapticsEnabled }),
      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
      toggleReducedMotion: () => set({ forceReducedMotion: !get().forceReducedMotion }),
    }),
    {
      name: 'hidratai/settings',
      version: SETTINGS_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hapticsEnabled: state.hapticsEnabled,
        soundEnabled: state.soundEnabled,
        forceReducedMotion: state.forceReducedMotion,
      }),
    },
  ),
);
