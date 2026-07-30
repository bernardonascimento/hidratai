import type { DayLog, Entry } from './types';

/** §4.2: hydrationMl = round(volumeMl * hydration). */
export function hydrationMlOf(volumeMl: number, hydration: number): number {
  return Math.round(volumeMl * hydration);
}

export function totalHydrationOf(entries: Entry[]): number {
  return entries.reduce((soma, e) => soma + e.hydrationMl, 0);
}

/** Volume de líquido, sem o fator — a outra coluna do resultado do dia (§4.2). */
export function totalVolumeOf(entries: Entry[]): number {
  return entries.reduce((soma, e) => soma + e.volumeMl, 0);
}

export function emptyDay(date: string, goalMl: number): DayLog {
  return { date, goalMl, entries: [], totalHydrationMl: 0, metGoal: false };
}

/**
 * Reconstrói os campos derivados a partir de `entries`.
 * §12: a soma do dia nunca pode vir de dois lugares — toda mutação passa por aqui.
 */
export function recalcDay(day: DayLog): DayLog {
  const totalHydrationMl = totalHydrationOf(day.entries);
  return { ...day, totalHydrationMl, metGoal: totalHydrationMl >= day.goalMl };
}

export const MAX_RETAINED_DAYS = 400;

/** Retenção do §3.1: mantém os N dias mais recentes, descarta o resto. */
export function pruneDays(
  days: Record<string, DayLog>,
  max: number = MAX_RETAINED_DAYS,
): Record<string, DayLog> {
  const chaves = Object.keys(days);
  if (chaves.length <= max) return days;

  const mantidas = chaves.sort().slice(-max);
  const resultado: Record<string, DayLog> = {};
  for (const chave of mantidas) resultado[chave] = days[chave];
  return resultado;
}
