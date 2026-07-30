import { previousDay } from '@/lib/date';

import type { DayLog } from './types';

export type Achievement = {
  id: string;
  title: string;
  /** Critério em uma linha, mostrado ao tocar. */
  criterion: string;
  /** Nome do ícone lucide (mapeado na UI). */
  icon: string;
  unlocked: boolean;
  /** 0..1 quando dá para mostrar o quanto falta. */
  progress?: number;
};

function allEntries(days: Record<string, DayLog>) {
  return Object.values(days).flatMap((d) => d.entries);
}

/** Um dia em que a meta foi batida antes do meio-dia. */
function metGoalBeforeNoon(days: Record<string, DayLog>): boolean {
  return Object.values(days).some((dia) => {
    if (!dia.metGoal) return false;
    const ordenados = [...dia.entries].sort((a, b) => a.at - b.at);
    let acumulado = 0;
    for (const entrada of ordenados) {
      acumulado += entrada.hydrationMl;
      if (acumulado >= dia.goalMl) {
        return new Date(entrada.at).getHours() < 12;
      }
    }
    return false;
  });
}

/** Maior número de bebidas diferentes registradas num mesmo dia. */
function maxDistinctDrinks(days: Record<string, DayLog>): number {
  return Object.values(days).reduce((max, dia) => {
    const distintas = new Set(dia.entries.map((e) => e.drinkId)).size;
    return Math.max(max, distintas);
  }, 0);
}

/** Maior sequência de dias com pelo menos um registro antes das 9h. */
function maxEarlyStreak(days: Record<string, DayLog>): number {
  const madrugadores = new Set(
    Object.values(days)
      .filter((dia) => dia.entries.some((e) => new Date(e.at).getHours() < 9))
      .map((dia) => dia.date),
  );

  let melhor = 0;
  for (const date of madrugadores) {
    // Só conta a partir do início de uma sequência.
    if (madrugadores.has(previousDay(date))) continue;
    let tamanho = 0;
    let cursor = date;
    while (madrugadores.has(cursor)) {
      tamanho += 1;
      // Avança um dia: reconstrói pela chave seguinte.
      const [y, m, d] = cursor.split('-').map(Number);
      const proximo = new Date(y, m - 1, d + 1);
      cursor = `${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, '0')}-${String(
        proximo.getDate(),
      ).padStart(2, '0')}`;
    }
    melhor = Math.max(melhor, tamanho);
  }
  return melhor;
}

function ratio(atual: number, alvo: number): number {
  return Math.min(1, alvo > 0 ? atual / alvo : 0);
}

/**
 * As 12 conquistas do §7.3, **derivadas dos dados** em vez de persistidas: não há
 * lista de `unlocked` para migrar nem risco de o estado divergir do histórico.
 * Quando a F4 introduzir congelamentos, duas delas ganham critério próprio.
 */
export function achievementsOf(input: {
  days: Record<string, DayLog>;
  streak: number;
}): Achievement[] {
  const { days, streak } = input;
  const registros = allEntries(days).length;
  const distintas = maxDistinctDrinks(days);
  const madrugador = maxEarlyStreak(days);
  const temPersonalizada = allEntries(days).some((e) => e.drinkId.startsWith('custom:'));

  return [
    {
      id: 'primeiro-registro',
      title: 'Primeiro copo',
      criterion: 'Registrar a primeira bebida',
      icon: 'droplet',
      unlocked: registros >= 1,
      progress: ratio(registros, 1),
    },
    {
      id: 'streak-3',
      title: '3 dias',
      criterion: 'Bater a meta 3 dias seguidos',
      icon: 'flame',
      unlocked: streak >= 3,
      progress: ratio(streak, 3),
    },
    {
      id: 'streak-7',
      title: '1 semana',
      criterion: 'Bater a meta 7 dias seguidos',
      // Não `flame` de novo: "3 dias" já usa, e dois blocos com o mesmo ícone não se
      // distinguem na grade. `zap` mantém a ideia de sequência com desenho próprio.
      icon: 'zap',
      unlocked: streak >= 7,
      progress: ratio(streak, 7),
    },
    {
      id: 'streak-30',
      title: '30 dias',
      criterion: 'Bater a meta 30 dias seguidos',
      icon: 'trophy',
      unlocked: streak >= 30,
      progress: ratio(streak, 30),
    },
    {
      id: 'streak-100',
      title: '100 dias',
      criterion: 'Bater a meta 100 dias seguidos',
      icon: 'award',
      unlocked: streak >= 100,
      progress: ratio(streak, 100),
    },
    {
      id: 'registros-100',
      title: '100 registros',
      criterion: 'Registrar 100 bebidas',
      icon: 'target',
      unlocked: registros >= 100,
      progress: ratio(registros, 100),
    },
    {
      id: 'registros-500',
      title: '500 registros',
      criterion: 'Registrar 500 bebidas',
      icon: 'medal',
      unlocked: registros >= 500,
      progress: ratio(registros, 500),
    },
    {
      id: 'meta-antes-meio-dia',
      title: 'Madrugador',
      criterion: 'Bater a meta antes do meio-dia',
      icon: 'sunrise',
      unlocked: metGoalBeforeNoon(days),
    },
    {
      id: 'cinco-bebidas-dia',
      title: 'Variedade',
      criterion: 'Cinco bebidas diferentes num dia',
      icon: 'cup-soda',
      unlocked: distintas >= 5,
      progress: ratio(distintas, 5),
    },
    {
      id: 'bebida-personalizada',
      title: 'Do seu jeito',
      criterion: 'Criar uma bebida personalizada',
      icon: 'sparkles',
      unlocked: temPersonalizada,
    },
    {
      id: 'semana-cheia',
      title: 'Semana cheia',
      criterion: 'Sete dias seguidos sem usar congelamento',
      icon: 'calendar-check',
      unlocked: streak >= 7,
      progress: ratio(streak, 7),
    },
    {
      id: 'sete-manhas',
      title: 'Sete manhãs',
      criterion: 'Registrar antes das 9h por 7 dias seguidos',
      icon: 'coffee',
      unlocked: madrugador >= 7,
      progress: ratio(madrugador, 7),
    },
  ];
}
