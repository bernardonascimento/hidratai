import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { elementById } from '@/domain/garden';
import { type MissionId, missionsForDay } from '@/domain/missions';
import { applyMetGoal, recalcStreak, revertMetGoal } from '@/domain/streak';
import type { DayLog } from '@/domain/types';
import { dayKey } from '@/lib/date';

export const GAMIFICATION_VERSION = 1;

export const XP_POR_REGISTRO = 10;
export const XP_BONUS_META = 50;
/** Teto diário do §7.2: sem ele, fracionar 30 registros de 50 ml vira farm. */
export const XP_MAX_POR_DIA = 100;

type GamificationState = {
  xp: number;
  /** XP ganho no dia lógico corrente, para aplicar o teto. */
  xpToday: number;
  xpTodayDate: string | null;

  streak: number;
  bestStreak: number;
  lastMetDate: string | null;
  freezesAvailable: number;
  freezesUsedOn: string[];
  /** 0=domingo … 6=sábado. Dia da semana que não quebra a ofensiva. */
  restDay: number | null;

  /** Litros bebidos na vida, em ml — base dos marcos. */
  lifetimeMl: number;

  /** Gotas do Cantinho: 1 por dia com meta batida, gastas em elementos. */
  drops: number;
  gardenUnlocked: string[];

  /** Missões do dia: guardamos **quais** são, nunca se foram cumpridas. */
  missionsDate: string | null;
  missionIds: MissionId[];
  previousMissionIds: MissionId[];
  /** Missões do dia anterior, para o resultado do dia contar quantas saíram. */
  yesterdayMissionIds: MissionId[];

  /** Último dia cujo resultado já foi mostrado — evita repetir o card. */
  resultShownFor: string | null;

  /** true depois de importar os valores que viviam em `useWater`. */
  seeded: boolean;

  seedFrom: (dados: { xp: number; streak: number; lastMetDate: string | null }) => void;
  ensureMissions: (date?: string) => void;
  syncStreak: (days: Record<string, DayLog>) => void;
  onEntryAdded: (input: {
    date: string;
    volumeMl: number;
    metGoalNow: boolean;
    days: Record<string, DayLog>;
  }) => { xpGained: number; streak: number; gainedFreeze: boolean };
  onEntryRemoved: (input: { date: string; volumeMl: number; lostGoal: boolean }) => void;
  unlockElement: (id: string) => boolean;
  markResultShown: (date: string) => void;
  setRestDay: (dia: number | null) => void;
  reset: () => void;
};

const ESTADO_INICIAL = {
  xp: 0,
  xpToday: 0,
  xpTodayDate: null,
  streak: 0,
  bestStreak: 0,
  lastMetDate: null,
  freezesAvailable: 0,
  freezesUsedOn: [],
  restDay: null,
  lifetimeMl: 0,
  drops: 0,
  gardenUnlocked: [],
  missionsDate: null,
  missionIds: [],
  previousMissionIds: [],
  yesterdayMissionIds: [],
  resultShownFor: null,
  seeded: false,
} satisfies Partial<GamificationState>;

/**
 * Estado do jogo: XP, ofensiva, congelamentos, missões do dia e marcos.
 *
 * Nasceu extraindo `xp`/`streak`/`lastMetDate` de `useWater` (§6 do
 * PLANO-GAMIFICACAO). Para **não criar import circular**, a semente não lê a store
 * de água daqui — o layout raiz passa os valores em `seedFrom` uma única vez.
 */
export const useGamification = create<GamificationState>()(
  persist(
    (set, get) => ({
      ...ESTADO_INICIAL,

      seedFrom: (dados) => {
        if (get().seeded) return;
        set({
          xp: dados.xp,
          streak: dados.streak,
          bestStreak: Math.max(dados.streak, get().bestStreak),
          lastMetDate: dados.lastMetDate,
          seeded: true,
        });
      },

      ensureMissions: (date = dayKey()) => {
        const estado = get();
        if (estado.missionsDate === date && estado.missionIds.length === 3) return;

        set({
          missionsDate: date,
          missionIds: missionsForDay(date, estado.missionIds),
          previousMissionIds: estado.missionIds,
          // As de ontem viram base do resultado do dia; só sobrescreve quando
          // realmente havia um dia anterior com missões.
          yesterdayMissionIds:
            estado.missionsDate && estado.missionIds.length > 0
              ? estado.missionIds
              : estado.yesterdayMissionIds,
        });
      },

      syncStreak: (days) => {
        const estado = get();
        const novo = recalcStreak({
          days,
          restDay: estado.restDay,
          streak: estado.streak,
          bestStreak: estado.bestStreak,
          lastMetDate: estado.lastMetDate,
          freezesAvailable: estado.freezesAvailable,
          freezesUsedOn: estado.freezesUsedOn,
        });

        if (
          novo.streak !== estado.streak ||
          novo.freezesAvailable !== estado.freezesAvailable ||
          novo.bestStreak !== estado.bestStreak
        ) {
          set(novo);
        }
      },

      onEntryAdded: ({ date, volumeMl, metGoalNow, days }) => {
        const estado = get();

        // Teto diário: o XP do dia zera quando o dia lógico vira.
        const mesmoDia = estado.xpTodayDate === date;
        const jaHoje = mesmoDia ? estado.xpToday : 0;
        const bruto = XP_POR_REGISTRO + (metGoalNow ? XP_BONUS_META : 0);
        const xpGained = Math.max(0, Math.min(bruto, XP_MAX_POR_DIA - jaHoje));

        let streakState = {
          streak: estado.streak,
          bestStreak: estado.bestStreak,
          lastMetDate: estado.lastMetDate,
          freezesAvailable: estado.freezesAvailable,
          freezesUsedOn: estado.freezesUsedOn,
        };
        let gainedFreeze = false;

        if (metGoalNow) {
          const resultado = applyMetGoal({
            ...streakState,
            days,
            restDay: estado.restDay,
            date,
          });
          gainedFreeze = resultado.gainedFreeze;
          streakState = {
            streak: resultado.streak,
            bestStreak: resultado.bestStreak,
            lastMetDate: resultado.lastMetDate,
            freezesAvailable: resultado.freezesAvailable,
            freezesUsedOn: resultado.freezesUsedOn,
          };
        }

        set({
          xp: estado.xp + xpGained,
          xpToday: jaHoje + xpGained,
          xpTodayDate: date,
          lifetimeMl: estado.lifetimeMl + volumeMl,
          // A moeda do Cantinho é dia cumprido, não volume: uma gota por dia.
          drops: metGoalNow ? estado.drops + 1 : estado.drops,
          ...streakState,
        });

        return { xpGained, streak: streakState.streak, gainedFreeze };
      },

      onEntryRemoved: ({ date, volumeMl, lostGoal }) => {
        const estado = get();
        const devolver = XP_POR_REGISTRO + (lostGoal ? XP_BONUS_META : 0);
        const mesmoDia = estado.xpTodayDate === date;

        const streakState = lostGoal
          ? revertMetGoal({
              date,
              streak: estado.streak,
              bestStreak: estado.bestStreak,
              lastMetDate: estado.lastMetDate,
              freezesAvailable: estado.freezesAvailable,
              freezesUsedOn: estado.freezesUsedOn,
            })
          : null;

        set({
          xp: Math.max(0, estado.xp - devolver),
          xpToday: mesmoDia ? Math.max(0, estado.xpToday - devolver) : estado.xpToday,
          lifetimeMl: Math.max(0, estado.lifetimeMl - volumeMl),
          ...(streakState ?? {}),
        });
      },

      unlockElement: (id) => {
        const estado = get();
        const elemento = elementById(id);
        if (!elemento) return false;
        if (estado.gardenUnlocked.includes(id)) return false;
        if (estado.drops < elemento.cost) return false;

        set({
          drops: estado.drops - elemento.cost,
          gardenUnlocked: [...estado.gardenUnlocked, id],
        });
        return true;
      },

      markResultShown: (date) => set({ resultShownFor: date }),

      setRestDay: (dia) => set({ restDay: dia }),

      reset: () => set({ ...ESTADO_INICIAL, seeded: true }),
    }),
    {
      name: 'hidratai/gamification',
      version: GAMIFICATION_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        xp: state.xp,
        xpToday: state.xpToday,
        xpTodayDate: state.xpTodayDate,
        streak: state.streak,
        bestStreak: state.bestStreak,
        lastMetDate: state.lastMetDate,
        freezesAvailable: state.freezesAvailable,
        freezesUsedOn: state.freezesUsedOn,
        restDay: state.restDay,
        lifetimeMl: state.lifetimeMl,
        drops: state.drops,
        gardenUnlocked: state.gardenUnlocked,
        missionsDate: state.missionsDate,
        missionIds: state.missionIds,
        previousMissionIds: state.previousMissionIds,
        yesterdayMissionIds: state.yesterdayMissionIds,
        resultShownFor: state.resultShownFor,
        seeded: state.seeded,
      }),
    },
  ),
);
