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

/**
 * Todos os dias de **um** mês, alinhados em colunas de segunda a domingo.
 *
 * `mes` ('YYYY-MM') é parâmetro, e antes não era — vinha fixo de `hoje`, então o mês
 * anterior ficava inalcançável pelo mesmo motivo que o ano anterior ficava: o dado no
 * disco e nenhuma tela capaz de mostrá-lo.
 */
export function monthGrid(
  days: Record<string, DayLog>,
  metaAtual: number,
  hoje: string = dayKey(),
  restDay: number | null = null,
  mes?: string,
): MonthGrid {
  const [ano, mesNum] = (mes ?? hoje.slice(0, 7)).split('-').map(Number);
  const mes0 = mesNum - 1;
  // Dia 0 do mês seguinte é o último deste — evita tabela de 28/29/30/31.
  const ultimo = new Date(ano, mes0 + 1, 0).getDate();

  return {
    month: `${ano}-${String(mesNum).padStart(2, '0')}`,
    offset: indiceSemanaSeg(chaveDe(ano, mes0, 1)),
    slots: Array.from({ length: ultimo }, (_, i) =>
      slotDe(chaveDe(ano, mes0, i + 1), days, metaAtual, hoje, restDay),
    ),
  };
}

/** Anda `delta` meses numa chave 'YYYY-MM'. Aceita virar o ano nas duas direções. */
export function shiftMonth(mes: string, delta: number): string {
  const [ano, m] = mes.split('-').map(Number);
  // `new Date` normaliza mês 0 e 13 sozinho, virando o ano — fazer a conta à mão é onde
  // se erra dezembro→janeiro.
  const d = new Date(ano, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Primeiro mês navegável: o mais antigo com registro, ou o corrente se não houver nada.
 *
 * Ao contrário dos anos, aqui **não** se filtram os meses vazios: mês sem registro no
 * meio do caminho faz parte da linha do tempo, e pular de março para junho esconderia
 * que abril e maio existiram e foram em branco.
 */
export function firstMonthWithData(days: Record<string, DayLog>, hoje: string = dayKey()): string {
  const chaves = Object.keys(days);
  if (chaves.length === 0) return hoje.slice(0, 7);
  return chaves.reduce((min, k) => (k < min ? k : min), chaves[0]).slice(0, 7);
}

/** '2026-08' -> 'agosto de 2026'. */
export function monthLabel(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${MESES_CHEIOS[m - 1]} de ${ano}`;
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
const MESES_CHEIOS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/**
 * Média diária de cada mês de **um** ano, de janeiro a dezembro.
 *
 * Não são "os últimos 12 meses": naquela forma a lista começava em agosto do ano
 * passado e terminava em julho, o que não é um ano que alguém reconheça. Aqui janeiro
 * é sempre o primeiro e dezembro o último, e os meses que ainda não chegaram vêm
 * marcados como futuros em vez de zerados.
 *
 * `ano` é parâmetro, e antes não era — o ano vinha fixo de `hoje`. Em 1º de janeiro quem
 * usou o app em dezembro abria a aba e via um gráfico vazio, e o ano anterior ficava
 * **invisível para sempre**: os dados estavam no disco e nenhuma tela os alcançava.
 */
export function yearMonths(
  days: Record<string, DayLog>,
  hoje: string = dayKey(),
  ano?: number,
): MonthSlot[] {
  const [anoHoje, mesHoje] = hoje.split('-').map(Number);
  const alvo = ano ?? anoHoje;

  return Array.from({ length: 12 }, (_, mes0) => {
    const chave = `${alvo}-${String(mes0 + 1).padStart(2, '0')}`;
    const doMes = Object.values(days).filter((d) => d.date.startsWith(chave));
    const soma = doMes.reduce((acc, d) => acc + d.totalHydrationMl, 0);

    return {
      month: chave,
      label: MESES_CURTOS[mes0],
      averageMl: doMes.length > 0 ? Math.round(soma / doMes.length) : 0,
      daysTracked: doMes.length,
      // Ano passado não tem mês futuro; ano que vem tem os doze.
      future: alvo > anoHoje || (alvo === anoHoje && mes0 + 1 > mesHoje),
    };
  });
}

/**
 * Anos que o usuário pode ver, do mais antigo ao mais recente.
 *
 * Inclui **sempre** o ano corrente, mesmo sem registro nenhum: é o ano que a aba abre
 * por padrão, e uma lista vazia deixaria o seletor sem nada para selecionar. Fora dele,
 * só anos que têm dado — navegar por anos vazios é atrito sem informação.
 */
export function yearsWithData(days: Record<string, DayLog>, hoje: string = dayKey()): number[] {
  const anoHoje = Number(hoje.slice(0, 4));
  const anos = new Set<number>([anoHoje]);
  for (const chave of Object.keys(days)) anos.add(Number(chave.slice(0, 4)));
  return [...anos].sort((a, b) => a - b);
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
