import { WATER_DRINK_ID } from '@/domain/drinks';
import { DEFAULT_GOAL_ML } from '@/domain/goal';
import type { DayLog, Entry } from '@/domain/types';
import { recalcDay } from '@/domain/water';
import { dayKeyOf, middayOf } from '@/lib/date';

/** Versão atual do dado persistido de `useWater`. Bump a cada mudança de forma. */
export const WATER_VERSION = 1;

/** Parte de `useWater` que vai para o disco. */
export type PersistedWater = {
  goalMl: number;
  xp: number;
  streak: number;
  lastMetDate: string | null;
  days: Record<string, DayLog>;
  lastDrinkId: string;
};

/**
 * Forma persistida na v0 — a que existe nos aparelhos que já usaram o app antes
 * desta migração. Guardava um array cru de registros por dia e não tinha `version`
 * (o "/v1" no nome da chave era só nome, o zustand nunca leu aquilo).
 */
type V0Entry = { id?: string; ml?: number; at?: number };
type V0 = {
  metaMl?: number;
  xp?: number;
  streak?: number;
  ultimoDiaMeta?: string | null;
  porDia?: Record<string, V0Entry[]>;
};

function isV0(value: unknown): value is V0 {
  return typeof value === 'object' && value !== null;
}

/**
 * v0 → v1: `porDia: Record<date, {id, ml, at}[]>` vira `days: Record<date, DayLog>`.
 *
 * Ninguém perde histórico: cada registro antigo é preservado como uma `Entry` de
 * água (fator 1.0, logo `hydrationMl === volumeMl`). O plano previa colapsar o dia
 * numa única entrada sintética, mas o dado real já tem `at` por registro — então
 * preservamos todos, e o meio-dia local só entra como fallback quando falta `at`.
 *
 * Ressalva conhecida: `goalMl` histórico não existia no v0. Usamos a meta atual
 * como aproximação; a partir da v1 a meta é congelada por dia e isso não repete.
 *
 * Os registros são **reagrupados pelo dia lógico** (`dayKeyOf(at)`), não pela chave
 * antiga: a v0 fechava o dia à meia-noite, então um copo bebido à 01:30 foi gravado
 * no dia seguinte. Sem reagrupar, o total ficaria na chave errada para sempre e
 * apareceria zerado durante a madrugada.
 */
export function migrateWater(persisted: unknown, fromVersion: number): PersistedWater {
  if (fromVersion >= WATER_VERSION) {
    return persisted as PersistedWater;
  }

  const v0: V0 = isV0(persisted) ? persisted : {};
  const goalMl = typeof v0.metaMl === 'number' ? v0.metaMl : DEFAULT_GOAL_ML;
  const porChave: Record<string, Entry[]> = {};

  for (const [date, registros] of Object.entries(v0.porDia ?? {})) {
    (registros ?? []).forEach((e, indice) => {
      if (typeof e?.ml !== 'number') return;

      const at = typeof e.at === 'number' ? e.at : middayOf(date);
      const chave = dayKeyOf(at);
      const entry: Entry = {
        id: e.id ?? `${date}-migrado-${indice}`,
        at,
        drinkId: WATER_DRINK_ID,
        volumeMl: e.ml,
        hydrationMl: e.ml,
      };

      porChave[chave] = [...(porChave[chave] ?? []), entry];
    });
  }

  const days: Record<string, DayLog> = {};
  for (const [date, entries] of Object.entries(porChave)) {
    // Dias vazios eram lixo do "desfazer": não vale carregar para a v1.
    if (entries.length === 0) continue;

    days[date] = recalcDay({
      date,
      goalMl,
      entries: [...entries].sort((a, b) => a.at - b.at),
      totalHydrationMl: 0,
      metGoal: false,
    });
  }

  return {
    goalMl,
    xp: typeof v0.xp === 'number' ? v0.xp : 0,
    streak: typeof v0.streak === 'number' ? v0.streak : 0,
    lastMetDate: v0.ultimoDiaMeta ?? null,
    days,
    lastDrinkId: WATER_DRINK_ID,
  };
}
