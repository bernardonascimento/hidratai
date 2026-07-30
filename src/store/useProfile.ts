import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { clampGoal, computeGoal } from '@/domain/goal';
import { DEFAULT_REMINDERS, type ReminderPrefs } from '@/domain/reminders';
import type { Activity, Climate, Profile, Sex, Unit } from '@/domain/types';
import { useWater } from '@/store/useWater';

export const PROFILE_VERSION = 2;

export const DEFAULT_PROFILE: Profile = {
  weightKg: 70,
  sex: 'na',
  activity: 'baixa',
  climate: 'temperado',
  wakeMinutes: 7 * 60,
  sleepMinutes: 23 * 60,
  unit: 'ml',
};

type ProfileState = {
  profile: Profile;
  /** Meta digitada à mão; quando existe, vence a calculada. */
  goalOverride: number | null;
  onboardingDone: boolean;
  /**
   * Preferência de lembrete. `enabled` reflete a **vontade** do usuário, não a
   * permissão do sistema: quem revoga no Ajustes do iOS continua com `true` aqui,
   * e é `lib/notifications` que checa a permissão antes de agendar. Guardar as
   * duas coisas no mesmo campo faria o app esquecer a escolha a cada revogação.
   */
  reminders: ReminderPrefs;

  setProfile: (patch: Partial<Profile>) => void;
  setGoalOverride: (ml: number | null) => void;
  setReminders: (patch: Partial<ReminderPrefs>) => void;
  completeOnboarding: () => void;
};

/**
 * A **meta corrente efetiva mora em `useWater.goalMl`** — é ela que é congelada em
 * `DayLog.goalMl` no primeiro registro do dia. Esta store guarda o perfil e a
 * preferência manual, e *escreve* o resultado lá. Uma fonte de escrita, um lugar
 * para ler: evita duas metas divergindo.
 */
function sincronizarMeta(profile: Profile, override: number | null) {
  const meta = override !== null ? clampGoal(override) : computeGoal(profile);
  useWater.getState().setGoal(meta);
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      goalOverride: null,
      onboardingDone: false,
      reminders: DEFAULT_REMINDERS,

      setProfile: (patch) => {
        const profile = { ...get().profile, ...patch };
        set({ profile });
        sincronizarMeta(profile, get().goalOverride);
      },

      setGoalOverride: (ml) => {
        const override = ml === null ? null : clampGoal(ml);
        set({ goalOverride: override });
        sincronizarMeta(get().profile, override);
      },

      setReminders: (patch) => set({ reminders: { ...get().reminders, ...patch } }),

      completeOnboarding: () => {
        set({ onboardingDone: true });
        sincronizarMeta(get().profile, get().goalOverride);
      },
    }),
    {
      name: 'hidratai/profile',
      version: PROFILE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      /**
       * v1 -> v2: só acrescenta `reminders`. Aditiva de propósito — quem já usa o
       * app mantém peso, rotina e meta, e cai no padrão de lembrete desligado (a
       * permissão dele nunca foi pedida).
       */
      migrate: (persisted, version) => {
        const estado = (persisted ?? {}) as Partial<ProfileState>;
        if (version >= 2) return estado as ProfileState;
        return { ...estado, reminders: DEFAULT_REMINDERS } as ProfileState;
      },
      partialize: (state) => ({
        profile: state.profile,
        goalOverride: state.goalOverride,
        onboardingDone: state.onboardingDone,
        reminders: state.reminders,
      }),
    },
  ),
);

/** Meta que o perfil sugere, ignorando o override — usada nas telas de ajuste. */
export function useSuggestedGoal(): number {
  return useProfile((s) => computeGoal(s.profile));
}

export type { Activity, Climate, Sex, Unit };
