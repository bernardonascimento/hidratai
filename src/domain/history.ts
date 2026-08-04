import { dayKey, weekdayOf } from '@/lib/date';

import type { DayLog } from './types';

export type DaySlot = {
  date: string;
  /** 0..1+ — pode passar de 1 quando o dia superou a meta. */
  ratio: number;
  hydrationMl: number;
  goalMl: number;
  metGoal: boolean;
  /** Nenhum registro naquele dia. */
  empty: boolean;
  /**
   * Dia que **ainda não chegou**. Separado de `empty` de propósito: um dia futuro não é
   * um dia perdido, e pintá-los igual faria a semana começar sempre "falhada".
   */
  future: boolean;
  /**
   * Cai no dia livre da ofensiva. Mesma razão de existir que `future`: um domingo
   * marcado como livre e sem registro **não é uma falha**, e pintá-lo com o cinza de
   * "não bebeu" transforma uma folga combinada em dívida no calendário.
   */
  restDay: boolean;
};

/** Índice do dia na semana que **começa na segunda**: seg=0 … dom=6. */
function indiceSemanaSeg(key: string): number {
  return (weekdayOf(key) + 6) % 7;
}

function chaveDe(ano: number, mes0: number, dia: number): string {
  return `${ano}-${String(mes0 + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function slotDe(
  date: string,
  days: Record<string, DayLog>,
  metaAtual: number,
  hoje: string,
  restDay: number | null,
): DaySlot {
  const dia = days[date];
  const future = date > hoje;
  const ehLivre = restDay !== null && weekdayOf(date) === restDay;

  if (!dia) {
    return {
      date,
      ratio: 0,
      hydrationMl: 0,
      goalMl: metaAtual,
      metGoal: false,
      empty: true,
      future,
      restDay: ehLivre,
    };
  }
  return {
    date,
    ratio: dia.goalMl > 0 ? dia.totalHydrationMl / dia.goalMl : 0,
    hydrationMl: dia.totalHydrationMl,
    goalMl: dia.goalMl,
    metGoal: dia.metGoal,
    empty: dia.entries.length === 0,
    future,
    restDay: ehLivre,
  };
}

/**
 * A **semana do calendário** em que hoje cai, de segunda a domingo.
 *
 * Não é "os últimos 7 dias": com a janela deslizante, a mesma segunda-feira aparecia
 * em posições diferentes a cada dia e não havia como comparar uma semana com a outra.
 */
export function weekSlots(
  days: Record<string, DayLog>,
  metaAtual: number,
  hoje: string = dayKey(),
  restDay: number | null = null,
): DaySlot[] {
  const [y, m, d] = hoje.split('-').map(Number);
  const segunda = new Date(y, m - 1, d - indiceSemanaSeg(hoje));

  return Array.from({ length: 7 }, (_, i) => {
    const data = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i);
    return slotDe(
      chaveDe(data.getFullYear(), data.getMonth(), data.getDate()),
      days,
      metaAtual,
      hoje,
      restDay,
    );
  });
}

export type MonthGrid = {
  /** 'YYYY-MM' do mês exibido. */
  month: string;
  /**
   * Colunas vazias antes do dia 1, para ele cair na coluna do seu dia da semana. É o
   * que torna a grade um calendário em vez de uma fita de quadradinhos.
   */
  offset: number;
  slots: DaySlot[];
};

/** Todos os dias do **mês corrente**, alinhados em colunas de segunda a domingo. */
export function monthGrid(
  days: Record<string, DayLog>,
  metaAtual: number,
  hoje: string = dayKey(),
  restDay: number | null = null,
): MonthGrid {
  const [ano, mes] = hoje.split('-').map(Number);
  const mes0 = mes - 1;
  // Dia 0 do mês seguinte é o último deste — evita tabela de 28/29/30/31.
  const ultimo = new Date(ano, mes0 + 1, 0).getDate();

  return {
    month: `${ano}-${String(mes).padStart(2, '0')}`,
    offset: indiceSemanaSeg(chaveDe(ano, mes0, 1)),
    slots: Array.from({ length: ultimo }, (_, i) =>
      slotDe(chaveDe(ano, mes0, i + 1), days, metaAtual, hoje, restDay),
    ),
  };
}

export type HistoryStats = {
  /** Média diária considerando só os dias com registro. */
  averageMl: number;
  bestMl: number;
  bestDate: string | null;
  goalsMet: number;
  daysTracked: number;
};

export function statsOf(slots: DaySlot[]): HistoryStats {
  const comRegistro = slots.filter((s) => !s.empty);
  const soma = comRegistro.reduce((acc, s) => acc + s.hydrationMl, 0);
  const melhor = comRegistro.reduce<DaySlot | null>(
    (acc, s) => (acc === null || s.hydrationMl > acc.hydrationMl ? s : acc),
    null,
  );

  return {
    averageMl: comRegistro.length > 0 ? Math.round(soma / comRegistro.length) : 0,
    bestMl: melhor?.hydrationMl ?? 0,
    bestDate: melhor?.date ?? null,
    goalsMet: slots.filter((s) => s.metGoal).length,
    daysTracked: comRegistro.length,
  };
}

export type MonthSlot = {
  /** 'YYYY-MM' */
  month: string;
  label: string;
  averageMl: number;
  daysTracked: number;
  /** Mês que ainda não chegou — não é mês sem água. */
  future: boolean;
};

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Média diária de **cada mês do ano corrente**, de janeiro a dezembro.
 *
 * Não são "os últimos 12 meses": naquela forma a lista começava em agosto do ano
 * passado e terminava em julho, o que não é um ano que alguém reconheça. Aqui janeiro
 * é sempre o primeiro e dezembro o último, e os meses que ainda não chegaram vêm
 * marcados como futuros em vez de zerados.
 */
export function yearMonths(
  days: Record<string, DayLog>,
  hoje: string = dayKey(),
): MonthSlot[] {
  const [ano, mesHoje] = hoje.split('-').map(Number);

  return Array.from({ length: 12 }, (_, mes0) => {
    const chave = `${ano}-${String(mes0 + 1).padStart(2, '0')}`;
    const doMes = Object.values(days).filter((d) => d.date.startsWith(chave));
    const soma = doMes.reduce((acc, d) => acc + d.totalHydrationMl, 0);

    return {
      month: chave,
      label: MESES_CURTOS[mes0],
      averageMl: doMes.length > 0 ? Math.round(soma / doMes.length) : 0,
      daysTracked: doMes.length,
      future: mes0 + 1 > mesHoje,
    };
  });
}

/**
 * Três letras, não uma. Com a inicial só, a semana saía `D S T Q Q S S` — três "S" e
 * dois "Q" indistinguíveis, e ninguém sabia qual barra era qual dia.
 */
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIAS_CHEIOS = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
];

/** Rótulo curto do dia da semana ('seg'), para o eixo do gráfico. */
export function weekdayShort(key: string): string {
  return DIAS_CURTOS[weekdayOf(key)];
}

/** Nome cheio ('segunda'), para o leitor de tela — 'seg' soa como sigla. */
export function weekdayFull(key: string): string {
  return DIAS_CHEIOS[weekdayOf(key)];
}

/** '2026-07-28' -> '28/07' */
export function shortDate(key: string): string {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}
