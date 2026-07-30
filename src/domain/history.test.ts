import {
  monthGrid,
  shortDate,
  statsOf,
  weekSlots,
  weekdayFull,
  weekdayShort,
  yearMonths,
} from '@/domain/history';
import type { DayLog } from '@/domain/types';
import { emptyDay, recalcDay } from '@/domain/water';

function dia(date: string, hydrationMl: number, goalMl = 2000): DayLog {
  return recalcDay({
    ...emptyDay(date, goalMl),
    entries: [
      {
        id: `${date}-1`,
        at: new Date(2026, 6, 28, 10, 0).getTime(),
        drinkId: 'agua',
        volumeMl: hydrationMl,
        hydrationMl,
      },
    ],
  });
}

const DAYS: Record<string, DayLog> = {
  '2026-07-28': dia('2026-07-28', 900),
  '2026-07-27': dia('2026-07-27', 2100),
  '2026-07-26': dia('2026-07-26', 2000),
  // 25 ausente de propósito: é um buraco no histórico
  '2026-07-24': dia('2026-07-24', 1000),
};

describe('weekSlots', () => {
  it('devolve a semana do calendário, de segunda a domingo', () => {
    // 2026-07-28 é terça; a semana vai de 27 (seg) a 02/08 (dom)
    const slots = weekSlots(DAYS, 2000, '2026-07-28');
    expect(slots.map((s) => s.date)).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ]);
  });

  it('começa na segunda mesmo quando hoje é domingo', () => {
    // 2026-08-02 é domingo: a semana dele começou em 27/07
    const slots = weekSlots({}, 2000, '2026-08-02');
    expect(slots[0].date).toBe('2026-07-27');
    expect(slots[6].date).toBe('2026-08-02');
  });

  it('separa dia futuro de dia sem registro', () => {
    const slots = weekSlots(DAYS, 2000, '2026-07-28');
    // 27 e 28 já passaram e têm registro
    expect(slots[0]).toMatchObject({ empty: false, future: false });
    // 29 em diante ainda não chegou
    expect(slots[2]).toMatchObject({ empty: true, future: true });
    expect(slots[6].future).toBe(true);
  });

  it('usa a meta congelada de cada dia, não a meta atual', () => {
    const days = { '2026-07-28': dia('2026-07-28', 1500, 3000) };
    const slots = weekSlots(days, 2000, '2026-07-28');
    const terca = slots.find((s) => s.date === '2026-07-28')!;
    expect(terca.goalMl).toBe(3000);
    expect(terca.ratio).toBeCloseTo(0.5, 5);
  });
});

describe('monthGrid', () => {
  it('devolve todos os dias do mês corrente', () => {
    const grade = monthGrid(DAYS, 2000, '2026-07-28');
    expect(grade.month).toBe('2026-07');
    expect(grade.slots).toHaveLength(31);
    expect(grade.slots[0].date).toBe('2026-07-01');
    expect(grade.slots[30].date).toBe('2026-07-31');
  });

  it('alinha o dia 1 na coluna do dia da semana dele', () => {
    // 2026-07-01 é quarta -> terceira coluna numa semana que começa na segunda
    expect(monthGrid({}, 2000, '2026-07-28').offset).toBe(2);
    // 2026-02-01 de 2026 é domingo -> última coluna
    expect(monthGrid({}, 2000, '2026-02-10').offset).toBe(6);
  });

  it('acerta o tamanho de fevereiro, inclusive em ano bissexto', () => {
    expect(monthGrid({}, 2000, '2026-02-10').slots).toHaveLength(28);
    expect(monthGrid({}, 2000, '2028-02-10').slots).toHaveLength(29);
  });

  it('marca como futuro só o que vem depois de hoje', () => {
    const grade = monthGrid(DAYS, 2000, '2026-07-28');
    expect(grade.slots[27].future).toBe(false); // dia 28
    expect(grade.slots[28].future).toBe(true); // dia 29
  });
});

describe('yearMonths', () => {
  it('devolve janeiro a dezembro do ano corrente, nessa ordem', () => {
    const meses = yearMonths(DAYS, '2026-07-28');
    expect(meses).toHaveLength(12);
    expect(meses[0].month).toBe('2026-01');
    expect(meses[0].label).toBe('jan');
    expect(meses[11].month).toBe('2026-12');
    expect(meses[11].label).toBe('dez');
  });

  it('calcula a média do mês', () => {
    const meses = yearMonths(DAYS, '2026-07-28');
    const julho = meses.find((m) => m.month === '2026-07')!;
    // (900 + 2100 + 2000 + 1000) / 4 = 1500
    expect(julho).toMatchObject({ averageMl: 1500, daysTracked: 4 });
  });

  it('marca os meses que ainda não chegaram', () => {
    const meses = yearMonths(DAYS, '2026-07-28');
    expect(meses[6].future).toBe(false); // julho
    expect(meses[7].future).toBe(true); // agosto
    expect(meses.filter((m) => m.future)).toHaveLength(5);
  });

  it('mês sem dado fica em zero, não em NaN', () => {
    const meses = yearMonths(DAYS, '2026-07-28');
    expect(meses[0]).toMatchObject({ averageMl: 0, daysTracked: 0 });
  });
});

describe('statsOf', () => {
  it('calcula média só com os dias registrados', () => {
    const stats = statsOf(monthGrid(DAYS, 2000, '2026-07-28').slots);
    // (1000 + 2000 + 2100 + 900) / 4 = 1500
    expect(stats.averageMl).toBe(1500);
    expect(stats.daysTracked).toBe(4);
  });

  it('encontra o melhor dia e conta as metas batidas', () => {
    const stats = statsOf(monthGrid(DAYS, 2000, '2026-07-28').slots);
    expect(stats.bestMl).toBe(2100);
    expect(stats.bestDate).toBe('2026-07-27');
    expect(stats.goalsMet).toBe(2); // 27 e 26
  });

  it('não conta os dias futuros do mês', () => {
    // Julho tem 31 dias na grade, mas só 4 com registro — o resto é futuro ou buraco.
    const stats = statsOf(monthGrid(DAYS, 2000, '2026-07-28').slots);
    expect(stats.daysTracked).toBe(4);
  });

  it('não divide por zero quando não há nada', () => {
    const stats = statsOf(monthGrid({}, 2000, '2026-07-28').slots);
    expect(stats).toMatchObject({ averageMl: 0, bestMl: 0, bestDate: null, goalsMet: 0 });
  });
});

describe('formatação de data', () => {
  it('dá a letra do dia da semana', () => {
    // 2026-07-28 é uma terça
    expect(weekdayShort('2026-07-28')).toBe('ter');
    expect(weekdayFull('2026-07-28')).toBe('terça');
  });

  it('encurta a data', () => {
    expect(shortDate('2026-07-28')).toBe('28/07');
  });
});
