import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { WATER_DRINK_ID, hydrationOf } from '@/domain/drinks';
import { DEFAULT_GOAL_ML, clampGoal } from '@/domain/goal';
import type { DayLog, Entry } from '@/domain/types';
import { emptyDay, hydrationMlOf, pruneDays, recalcDay } from '@/domain/water';
import { dayKey, middayOf, previousDay } from '@/lib/date';
import { useLogicalDay } from '@/store/useLogicalDay';
import { useGamification } from '@/store/useGamification';
import { WATER_VERSION, migrateWater } from '@/store/waterMigrations';

export type AddResult = {
  /** true só na transição — o registro que fez o dia cruzar a meta. */
  metGoalNow: boolean;
  xpGained: number;
  streak: number;
  gainedFreeze: boolean;
  entryId: string;
};

type WaterState = {
  /** Meta corrente. Ao primeiro registro do dia ela é congelada em `DayLog.goalMl`. */
  goalMl: number;
  days: Record<string, DayLog>;
  lastDrinkId: string;

  /**
   * @deprecated XP e ofensiva vivem em `useGamification` desde 28/07/2026.
   * Estes campos ficam **apenas** como origem da semente única (o layout raiz os
   * passa para `seedFrom`) e para não exigir uma migração destrutiva do disco.
   * Nada na UI deve ler daqui.
   */
  xp: number;
  streak: number;
  lastMetDate: string | null;

  addEntry: (drinkId: string, volumeMl: number) => AddResult;
  /**
   * Registro retroativo em **ontem** (§F5, "preencher ontem"). Devolve `false` se a
   * data não for ontem: retroagir mais que isso viraria caça à ofensiva.
   */
  addEntryYesterday: (drinkId: string, volumeMl: number) => boolean;
  removeEntry: (id: string) => void;
  setGoal: (ml: number) => void;
};

/** Referência estável: seletor que devolve `[]` novo a cada render causa loop. */
const NO_ENTRIES: Entry[] = [];

export const useWater = create<WaterState>()(
  persist(
    (set, get) => ({
      goalMl: DEFAULT_GOAL_ML,
      days: {},
      lastDrinkId: WATER_DRINK_ID,
      xp: 0,
      streak: 0,
      lastMetDate: null,

      addEntry: (drinkId, volumeMl) => {
        const date = dayKey();
        const estado = get();

        // Meta congelada no primeiro registro do dia (§4.1): mudar a meta hoje
        // não reescreve o histórico.
        const anterior = estado.days[date] ?? emptyDay(date, estado.goalMl);

        const entry: Entry = {
          id: `${date}-${Date.now()}`,
          at: Date.now(),
          drinkId,
          volumeMl,
          hydrationMl: hydrationMlOf(volumeMl, hydrationOf(drinkId)),
        };

        const dia = recalcDay({ ...anterior, entries: [...anterior.entries, entry] });
        const metGoalNow = !anterior.metGoal && dia.metGoal;
        const days = { ...estado.days, [date]: dia };

        set({ days, lastDrinkId: drinkId });

        // XP, ofensiva e congelamentos são do jogo, não da água. A store de
        // gamificação recebe o fato consumado e decide o que fazer com ele.
        const jogo = useGamification.getState().onEntryAdded({
          date,
          volumeMl,
          metGoalNow,
          days,
        });

        return {
          metGoalNow,
          xpGained: jogo.xpGained,
          streak: jogo.streak,
          gainedFreeze: jogo.gainedFreeze,
          entryId: entry.id,
        };
      },

      /**
       * Preencher ontem. Serve para quem bebeu e esqueceu de marcar — o dia perdido
       * derruba a ofensiva por um erro de registro, não de hábito.
       *
       * Três decisões que o valem explicar:
       *
       * - **Não dá XP.** A ofensiva é recalculada (era o ponto), mas pontuar
       *   retroativo abriria a porta para inflar XP preenchendo o passado. O §3 do
       *   PLANO-GAMIFICACAO manda o jogo nunca recompensar o que não é hábito.
       * - **Usa a meta de hoje** quando ontem não existe no disco. A meta que valia
       *   ontem não foi gravada (só congela no primeiro registro do dia), e inventar
       *   outra seria pior que assumir a atual.
       * - **Só ontem.** `addEntryYesterday` recusa qualquer outra data.
       */
      addEntryYesterday: (drinkId, volumeMl) => {
        const estado = get();
        const date = previousDay(dayKey());

        const anterior = estado.days[date] ?? emptyDay(date, estado.goalMl);
        const entry: Entry = {
          // Meio-dia de ontem: a hora real se perdeu, e cravar "agora" colocaria um
          // registro de ontem com carimbo de hoje — o que quebraria a ordenação da
          // lista e a leitura do histórico.
          id: `${date}-retro-${Date.now()}`,
          at: middayOf(date),
          drinkId,
          volumeMl,
          hydrationMl: hydrationMlOf(volumeMl, hydrationOf(drinkId)),
        };

        const dia = recalcDay({ ...anterior, entries: [...anterior.entries, entry] });
        const days = { ...estado.days, [date]: dia };
        set({ days });

        // Recalcula a ofensiva olhando o histórico inteiro: é isto que devolve a
        // sequência de quem só tinha esquecido de registrar.
        useGamification.getState().syncStreak(days);
        return true;
      },

      removeEntry: (id) => {
        const estado = get();
        const date = Object.keys(estado.days).find((chave) =>
          estado.days[chave].entries.some((e) => e.id === id),
        );
        if (!date) return;

        const anterior = estado.days[date];
        const dia = recalcDay({
          ...anterior,
          entries: anterior.entries.filter((e) => e.id !== id),
        });

        const removido = anterior.entries.find((e) => e.id === id);
        const perdeuMeta = anterior.metGoal && !dia.metGoal;

        const days = { ...estado.days };
        if (dia.entries.length === 0) delete days[date];
        else days[date] = dia;

        set({ days });

        // Devolve o XP do registro e, se o dia deixou de bater a meta, também o
        // bônus e a ofensiva daquele dia.
        useGamification.getState().onEntryRemoved({
          date,
          volumeMl: removido?.volumeMl ?? 0,
          lostGoal: perdeuMeta,
        });
      },

      setGoal: (ml) => set({ goalMl: clampGoal(ml) }),
    }),
    {
      // A chave não muda mais: é onde o dado dos aparelhos existentes está.
      // O versionamento agora é feito por `version`, não pelo nome.
      name: 'beba-agua/v1',
      version: WATER_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: migrateWater,
      partialize: (state) => ({
        goalMl: state.goalMl,
        days: state.days,
        lastDrinkId: state.lastDrinkId,
        xp: state.xp,
        streak: state.streak,
        lastMetDate: state.lastMetDate,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        // Retenção do §3.1, aplicada no boot.
        const podado = pruneDays(state.days);
        if (podado !== state.days) useWater.setState({ days: podado });
      },
    },
  ),
);

/** Registro do dia lógico corrente, se já houver algum. */
/**
 * Os seletores abaixo leem o dia de `useLogicalDay`, **não** de `dayKey()` direto:
 * chamada dentro do seletor, a função não é reativa e a tela congela no dia anterior
 * quando o app atravessa a virada das 03:00 aberto.
 */
export function useTodayLog(): DayLog | undefined {
  const hoje = useLogicalDay((s) => s.today);
  return useWater((s) => s.days[hoje]);
}

/** Dia lógico anterior — a missão "constante" e o resultado do dia dependem dele. */
export function useYesterdayLog(): DayLog | undefined {
  const hoje = useLogicalDay((s) => s.today);
  return useWater((s) => s.days[previousDay(hoje)]);
}

/** Água efetiva de hoje em ml (já com o fator de hidratação aplicado). */
export function useTodayHydrationMl(): number {
  const hoje = useLogicalDay((s) => s.today);
  return useWater((s) => s.days[hoje]?.totalHydrationMl ?? 0);
}

export function useTodayEntries(): Entry[] {
  const hoje = useLogicalDay((s) => s.today);
  return useWater((s) => s.days[hoje]?.entries ?? NO_ENTRIES);
}

/** Último registro de hoje — é o que o "Desfazer" apaga. */
export function useLastTodayEntry(): Entry | undefined {
  const hoje = useLogicalDay((s) => s.today);
  return useWater((s) => {
    const entries = s.days[hoje]?.entries;
    return entries && entries.length > 0 ? entries[entries.length - 1] : undefined;
  });
}
