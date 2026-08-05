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

/**
 * XP que um dia vale — **função do dia, não da ordem dos toques**.
 *
 * O XP era somado e devolvido por evento: `+10` a cada registro, `+50` ao bater a meta,
 * e o mesmo de volta ao desfazer. Só que o ganho passa pelo teto diário e a devolução
 * não passava, então os dois lados discordavam sempre que o teto entrava:
 *
 * - 6 copos de 500 numa meta de 3 L fecham o dia em 100 (50 dos cinco primeiros + 50 do
 *   sexto, que pediria 60 e só cabia 50)
 * - um 7º copo ganha **0**, porque o teto já estourou
 * - desfazer esse 7º devolvia **10** — dez pontos que nunca foram dados, tirados do XP
 *   acumulado de dias anteriores
 *
 * Calculando o dia inteiro de uma vez o problema desaparece por construção: registrar e
 * desfazer viram apenas a diferença entre o antes e o depois, e desfazer o que não
 * pagou dá diferença zero. Bug real, achado em 05/08/2026.
 *
 * Ressalva conhecida: preencher ontem (`addEntryYesterday`) não paga XP de propósito,
 * mas conta como registro aqui. Remover **essa** entrada depois devolve 10 que não
 * foram dados — o mesmo erro de antes, sobrando num canto bem mais estreito. Consertar
 * exigiria gravar o XP concedido dentro do `DayLog`.
 */
export function xpOfDay(day: Pick<DayLog, 'entries' | 'metGoal'> | undefined): number {
  if (!day) return 0;
  const bruto = day.entries.length * XP_POR_REGISTRO + (day.metGoal ? XP_BONUS_META : 0);
  return Math.min(XP_MAX_POR_DIA, bruto);
}

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
  /**
   * Último dia que já pagou gota. É o que impede o mesmo dia pagar duas vezes.
   *
   * Um campo só, e não uma lista de datas, porque **apenas o dia corrente consegue
   * pagar**: a gota sai de `onEntryAdded`, que só é chamada por `addEntry`, e essa usa
   * sempre `dayKey()`. O preenchimento retroativo (`addEntryYesterday`) recalcula a
   * ofensiva e não passa por aqui de propósito. Depois da virada das 03:00, um dia
   * anterior não tem mais como receber registro, então não tem mais como cobrar.
   */
  lastDropDate: string | null;
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

  /**
   * Ids de conquistas **já comemoradas** no toast.
   *
   * `null` quer dizer "nunca foi calculado", e é o estado de quem já usava o app antes
   * desta feature. A diferença importa: com `null` a primeira checagem grava tudo em
   * silêncio, senão despejaria dez avisos de uma vez por conquistas de semanas atrás.
   *
   * **Não** é a lista de desbloqueadas — isso continua derivado do histórico (§7.3).
   * Aqui só mora a memória do aviso.
   */
  achievementsSeen: string[] | null;

  seedFrom: (dados: { xp: number; streak: number; lastMetDate: string | null }) => void;
  ensureMissions: (date?: string) => void;
  syncStreak: (days: Record<string, DayLog>) => void;
  onEntryAdded: (input: {
    date: string;
    volumeMl: number;
    metGoalNow: boolean;
    days: Record<string, DayLog>;
  }) => {
    xpGained: number;
    streak: number;
    gainedFreeze: boolean;
    /** XP antes do registro, para quem chama derivar se subiu de nível. */
    xpAntes: number;
    xpDepois: number;
  };
  /**
   * O dia **antes e depois** da remoção, e não só o volume: é a diferença entre os dois
   * que diz quanto XP aquele registro tinha pago de fato. `dayAfter` vem com a lista já
   * vazia quando era o último registro do dia.
   */
  onEntryRemoved: (input: {
    date: string;
    volumeMl: number;
    lostGoal: boolean;
    dayBefore: DayLog;
    dayAfter: DayLog;
  }) => void;
  unlockElement: (id: string) => boolean;
  /**
   * Marca conquistas como comemoradas e devolve **quais eram novidade**.
   *
   * Fica na store, e não na tela, porque a marcação e a leitura têm de ser atômicas: em
   * duas telas chamando isso, ler-e-depois-gravar deixaria a mesma conquista anunciada
   * duas vezes.
   */
  registrarConquistasVistas: (idsDesbloqueados: string[]) => string[];
  markResultShown: (date: string) => void;
  setRestDay: (dia: number | null) => void;
  reset: () => void;
};

const ESTADO_INICIAL = {
  achievementsSeen: null as string[] | null,
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
  lastDropDate: null,
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

        /**
         * O XP do registro é a **diferença** entre o que o dia valia e o que passou a
         * valer, com o teto já dentro de `xpOfDay`. Assim o teto vale igual nas duas
         * direções, e `xpToday` deixa de ser um contador que caminha sozinho: ele é o
         * valor do dia, recalculado. Estado que tenha derivado antes desta conta se
         * conserta no primeiro registro.
         */
        const mesmoDia = estado.xpTodayDate === date;
        const valia = mesmoDia ? estado.xpToday : 0;
        const vale = xpOfDay(days[date]);
        const xpGained = Math.max(0, vale - valia);

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

        /**
         * A moeda do Cantinho é **dia cumprido**, não volume nem registro: uma gota por
         * dia, e uma só — daí o `lastDropDate`.
         *
         * Sem esse trava, desfazer o último copo e registrar de novo pagava outra gota
         * a cada volta, porque `metGoalNow` volta a ser verdadeiro. Era gota infinita
         * em dois toques, e o Cantinho inteiro (633 gotas, uns 2,4 anos de dias) saía
         * numa tarde. Bug real, achado em 05/08/2026.
         *
         * Estado antigo não tem a chave e chega `null`: quem já bateu a meta hoje antes
         * de atualizar pode ganhar uma gota a mais neste dia. É um erro de uma gota, uma
         * vez, para o lado generoso — não vale migração.
         */
        const ganhaGota = metGoalNow && estado.lastDropDate !== date;

        set({
          xp: estado.xp + xpGained,
          xpToday: vale,
          xpTodayDate: date,
          lifetimeMl: estado.lifetimeMl + volumeMl,
          drops: ganhaGota ? estado.drops + 1 : estado.drops,
          lastDropDate: ganhaGota ? date : estado.lastDropDate,
          ...streakState,
        });

        return {
          xpGained,
          streak: streakState.streak,
          gainedFreeze,
          xpAntes: estado.xp,
          xpDepois: estado.xp + xpGained,
        };
      },

      onEntryRemoved: ({ date, volumeMl, lostGoal, dayBefore, dayAfter }) => {
        const estado = get();
        const mesmoDia = estado.xpTodayDate === date;

        /**
         * O XP devolvido é a mesma diferença de `onEntryAdded`, lida ao contrário: o que
         * o dia valia menos o que passou a valer. Desfazer um registro que não pagou
         * nada, porque o teto do dia já havia estourado, devolve zero.
         *
         * Os dois lados vêm de `xpOfDay`, então isto vale para qualquer dia, não só
         * hoje — o "desfazer" do Histórico alcança dias passados, e ali não existe
         * contador de XP do dia para consultar.
         */
        const devolver = Math.max(0, xpOfDay(dayBefore) - xpOfDay(dayAfter));

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

        /**
         * XP, ofensiva e litros bebidos voltam atrás; a **gota não**, e a assimetria é
         * de propósito: gota é moeda gasta, e as outras não são.
         *
         * Tirar a gota junto não funciona de nenhum dos dois jeitos. Tirando e liberando
         * o dia para pagar outra vez, volta o exploit — gasta a gota num elemento,
         * desfaz, registra de novo e ganha outra, sem limite. Tirando e mantendo o dia
         * travado, quem só corrigiu um toque errado fica sem a gota de um dia que
         * cumpriu.
         *
         * Então a gota fica. O preço é uma gota indevida para quem bate a meta e depois
         * apaga água de verdade — uma por dia, no máximo, e para o lado generoso, que é
         * o do app.
         */
        set({
          xp: Math.max(0, estado.xp - devolver),
          // O contador do dia passa a ser o valor do dia, não ele mesmo menos algo.
          xpToday: mesmoDia ? xpOfDay(dayAfter) : estado.xpToday,
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

      registrarConquistasVistas: (idsDesbloqueados) => {
        const vistas = get().achievementsSeen;
        set({ achievementsSeen: idsDesbloqueados });
        // Primeira vez: grava e não anuncia nada.
        //
        // `== null` e não `=== null` de propósito: o estado persistido de quem instalou
        // antes desta feature não tem a chave, e dependendo de como o merge do `persist`
        // resolve isso o valor chega `undefined`. Com a comparação estrita, `undefined`
        // cairia no caminho de baixo e `new Set(undefined)` estouraria.
        if (vistas == null) return [];
        const jaVistas = new Set(vistas);
        return idsDesbloqueados.filter((id) => !jaVistas.has(id));
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
        lastDropDate: state.lastDropDate,
        gardenUnlocked: state.gardenUnlocked,
        missionsDate: state.missionsDate,
        missionIds: state.missionIds,
        previousMissionIds: state.previousMissionIds,
        yesterdayMissionIds: state.yesterdayMissionIds,
        resultShownFor: state.resultShownFor,
        seeded: state.seeded,
        achievementsSeen: state.achievementsSeen,
      }),
    },
  ),
);
