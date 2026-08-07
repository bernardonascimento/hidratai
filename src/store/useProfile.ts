import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { clampGoal, computeGoal } from '@/domain/goal';
import { DEFAULT_REMINDERS, type ReminderPrefs } from '@/domain/reminders';
import type { Activity, Climate, Profile, Unit } from '@/domain/types';
import { useWater } from '@/store/useWater';

export const PROFILE_VERSION = 3;

export const DEFAULT_PROFILE: Profile = {
  weightKg: 70,
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
       *
       * v2 -> v3: **apaga `sex` do disco.** O campo saiu do modelo em 07/08/2026, e sem
       * esta limpeza ele sobreviveria para sempre: o `setProfile` faz spread do perfil
       * carregado, então uma chave órfã é lida e regravada em cada alteração. Sem
       * apagar, o app continuaria guardando um dado que decidimos não tratar — e a ficha
       * de privacidade das lojas diz o que ele guarda.
       */
      migrate: (persisted, version) => {
        const estado = (persisted ?? {}) as Partial<ProfileState> & {
          profile?: Record<string, unknown>;
        };
        const comLembretes =
          version >= 2 ? estado : { ...estado, reminders: DEFAULT_REMINDERS };

        if (version >= 3) return comLembretes as ProfileState;

        // `sex` fora, o resto do perfil intacto. O tipo é `Record` porque `sex` já não
        // existe em `Profile` — desestruturar do tipo novo não compilaria.
        const perfilAntigo: Record<string, unknown> = comLembretes.profile ?? {};
        const { sex: _sex, ...perfilLimpo } = perfilAntigo;
        return {
          ...comLembretes,
          profile: { ...DEFAULT_PROFILE, ...perfilLimpo },
        } as ProfileState;
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

export type { Activity, Climate, Unit };
