import { dayKey, previousDay, weekdayOf } from '@/lib/date';

import type { DayLog } from './types';

export const MAX_FREEZES = 2;
export const DIAS_POR_FREEZE = 7;

export type StreakState = {
  streak: number;
  bestStreak: number;
  lastMetDate: string | null;
  freezesAvailable: number;
  /** Datas em que um congelamento salvou o dia — a UI conta isso sem drama. */
  freezesUsedOn: string[];
};

export type StreakInput = StreakState & {
  days: Record<string, DayLog>;
  /** 0 = domingo … 6 = sábado. Dia da semana que não quebra a ofensiva. */
  restDay: number | null;
  today?: string;
};

/** Lista os dias de `depois` até `antes` (exclusivo nas duas pontas), em ordem. */
function diasEntre(depois: string, antes: string): string[] {
  const out: string[] = [];
  let cursor = previousDay(antes);
  // Guarda contra laço infinito se as datas vierem invertidas.
  let limite = 800;
  while (cursor > depois && limite > 0) {
    out.unshift(cursor);
    cursor = previousDay(cursor);
    limite -= 1;
  }
  return out;
}

/**
 * Recalcula a ofensiva olhando os dias entre o último cumprido e hoje.
 *
 * Cada dia perdido consome um congelamento; sem congelamento, a ofensiva zera.
 * O **dia livre** (se configurado) nunca quebra nem consome nada. `bestStreak`
 * jamais diminui — o recorde é do usuário, não do momento.
 *
 * Função pura: recebe o estado e devolve o novo, sem tocar em store.
 */
export function recalcStreak(input: StreakInput): StreakState {
  const hoje = input.today ?? dayKey();
  const { days, restDay } = input;

  let { streak, bestStreak, lastMetDate, freezesAvailable } = input;
  const freezesUsedOn = [...input.freezesUsedOn];

  if (lastMetDate === null) {
    return { streak, bestStreak, lastMetDate, freezesAvailable, freezesUsedOn };
  }

  // Dias entre o último cumprido e hoje: hoje ainda está em curso, então não
  // conta como falha — só o passado fechado.
  for (const dia of diasEntre(lastMetDate, hoje)) {
    if (days[dia]?.metGoal) continue;
    if (restDay !== null && weekdayOf(dia) === restDay) continue;

    if (freezesAvailable > 0) {
      freezesAvailable -= 1;
      if (!freezesUsedOn.includes(dia)) freezesUsedOn.push(dia);
      continue;
    }

    streak = 0;
    break;
  }

  bestStreak = Math.max(bestStreak, streak);
  return { streak, bestStreak, lastMetDate, freezesAvailable, freezesUsedOn };
}

export type MetGoalResult = StreakState & {
  /** Ganhou um congelamento neste dia? A UI comemora discretamente. */
  gainedFreeze: boolean;
};

/**
 * Aplica "a meta de `date` foi batida agora".
 *
 * Continua a sequência se o dia anterior contou (cumprido, congelado ou livre);
 * senão recomeça em 1. A cada 7 dias de ofensiva ganha um congelamento, até 2.
 */
export function applyMetGoal(input: StreakInput & { date: string }): MetGoalResult {
  const { date, days, restDay } = input;
  let { streak, bestStreak, freezesAvailable } = input;
  const freezesUsedOn = [...input.freezesUsedOn];

  if (input.lastMetDate === date) {
    // Já contabilizado hoje: nada muda (desfazer e refazer não infla ofensiva).
    return {
      streak,
      bestStreak,
      lastMetDate: date,
      freezesAvailable,
      freezesUsedOn,
      gainedFreeze: false,
    };
  }

  const ontem = previousDay(date);
  const ontemContou =
    input.lastMetDate === ontem ||
    days[ontem]?.metGoal === true ||
    freezesUsedOn.includes(ontem) ||
    (restDay !== null && weekdayOf(ontem) === restDay);

  streak = ontemContou ? streak + 1 : 1;

  let gainedFreeze = false;
  if (streak % DIAS_POR_FREEZE === 0 && freezesAvailable < MAX_FREEZES) {
    freezesAvailable += 1;
    gainedFreeze = true;
  }

  bestStreak = Math.max(bestStreak, streak);

  return {
    streak,
    bestStreak,
    lastMetDate: date,
    freezesAvailable,
    freezesUsedOn,
    gainedFreeze,
  };
}

/**
 * Desfaz o "meta batida" de um dia — usado quando o usuário apaga um registro e o
 * dia deixa de cumprir a meta.
 */
export function revertMetGoal(input: StreakState & { date: string }): StreakState {
  // Devolve só o `StreakState` — nunca o `input` cru, que traz `date` junto e
  // vazaria esse campo para o estado persistido no spread da store.
  if (input.lastMetDate !== input.date) {
    return {
      streak: input.streak,
      bestStreak: input.bestStreak,
      lastMetDate: input.lastMetDate,
      freezesAvailable: input.freezesAvailable,
      freezesUsedOn: input.freezesUsedOn,
    };
  }

  return {
    streak: Math.max(0, input.streak - 1),
    bestStreak: input.bestStreak,
    lastMetDate: previousDay(input.date),
    freezesAvailable: input.freezesAvailable,
    freezesUsedOn: input.freezesUsedOn.filter((d) => d !== input.date),
  };
}
