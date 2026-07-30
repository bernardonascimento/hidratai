import {
  DIAS_POR_FREEZE,
  MAX_FREEZES,
  type StreakState,
  applyMetGoal,
  recalcStreak,
  revertMetGoal,
} from '@/domain/streak';
import type { DayLog } from '@/domain/types';
import { emptyDay, recalcDay } from '@/domain/water';

function diaCumprido(date: string): DayLog {
  return recalcDay({
    ...emptyDay(date, 2000),
    entries: [
      { id: `${date}-1`, at: new Date(2026, 6, 28, 10).getTime(), drinkId: 'agua', volumeMl: 2000, hydrationMl: 2000 },
    ],
  });
}

function diaFalho(date: string): DayLog {
  return recalcDay({
    ...emptyDay(date, 2000),
    entries: [
      { id: `${date}-1`, at: new Date(2026, 6, 28, 10).getTime(), drinkId: 'agua', volumeMl: 300, hydrationMl: 300 },
    ],
  });
}

const BASE: StreakState = {
  streak: 5,
  bestStreak: 5,
  lastMetDate: '2026-07-27',
  freezesAvailable: 0,
  freezesUsedOn: [],
};

describe('recalcStreak', () => {
  it('não mexe em nada quando ontem foi o último dia cumprido', () => {
    const novo = recalcStreak({ ...BASE, days: {}, restDay: null, today: '2026-07-28' });
    expect(novo.streak).toBe(5);
  });

  it('zera quando um dia foi perdido e não há congelamento', () => {
    // Último cumprido em 25, hoje é 28: 26 e 27 foram perdidos.
    const novo = recalcStreak({
      ...BASE,
      lastMetDate: '2026-07-25',
      days: {},
      restDay: null,
      today: '2026-07-28',
    });
    expect(novo.streak).toBe(0);
  });

  it('consome congelamento em vez de zerar', () => {
    const novo = recalcStreak({
      ...BASE,
      lastMetDate: '2026-07-26',
      freezesAvailable: 1,
      days: {},
      restDay: null,
      today: '2026-07-28',
    });
    expect(novo.streak).toBe(5);
    expect(novo.freezesAvailable).toBe(0);
    expect(novo.freezesUsedOn).toEqual(['2026-07-27']);
  });

  it('zera quando os congelamentos acabam antes dos dias perdidos', () => {
    const novo = recalcStreak({
      ...BASE,
      lastMetDate: '2026-07-24',
      freezesAvailable: 1,
      days: {},
      restDay: null,
      today: '2026-07-28',
    });
    expect(novo.streak).toBe(0);
    expect(novo.freezesAvailable).toBe(0);
  });

  it('não conta como perda o dia em que a meta foi batida', () => {
    const novo = recalcStreak({
      ...BASE,
      lastMetDate: '2026-07-25',
      days: { '2026-07-26': diaCumprido('2026-07-26'), '2026-07-27': diaCumprido('2026-07-27') },
      restDay: null,
      today: '2026-07-28',
    });
    expect(novo.streak).toBe(5);
  });

  it('dia livre não quebra nem consome congelamento', () => {
    // 2026-07-26 é um domingo (dia 0)
    const domingo = new Date(2026, 6, 26).getDay();
    const novo = recalcStreak({
      ...BASE,
      lastMetDate: '2026-07-25',
      days: { '2026-07-27': diaCumprido('2026-07-27') },
      restDay: domingo,
      today: '2026-07-28',
      freezesAvailable: 0,
    });
    expect(novo.streak).toBe(5);
    expect(novo.freezesAvailable).toBe(0);
  });

  it('hoje em curso não conta como falha', () => {
    const novo = recalcStreak({
      ...BASE,
      lastMetDate: '2026-07-27',
      days: { '2026-07-28': diaFalho('2026-07-28') },
      restDay: null,
      today: '2026-07-28',
    });
    expect(novo.streak).toBe(5);
  });

  it('bestStreak nunca diminui', () => {
    const novo = recalcStreak({
      ...BASE,
      streak: 3,
      bestStreak: 12,
      lastMetDate: '2026-07-20',
      days: {},
      restDay: null,
      today: '2026-07-28',
    });
    expect(novo.streak).toBe(0);
    expect(novo.bestStreak).toBe(12);
  });

  it('sem lastMetDate não há o que recalcular', () => {
    const novo = recalcStreak({
      ...BASE,
      streak: 0,
      lastMetDate: null,
      days: {},
      restDay: null,
      today: '2026-07-28',
    });
    expect(novo.streak).toBe(0);
  });
});

describe('applyMetGoal', () => {
  it('continua a sequência quando ontem contou', () => {
    const novo = applyMetGoal({
      ...BASE,
      date: '2026-07-28',
      days: {},
      restDay: null,
    });
    expect(novo.streak).toBe(6);
    expect(novo.lastMetDate).toBe('2026-07-28');
  });

  it('recomeça em 1 quando ontem não contou', () => {
    const novo = applyMetGoal({
      ...BASE,
      lastMetDate: '2026-07-20',
      streak: 0,
      date: '2026-07-28',
      days: {},
      restDay: null,
    });
    expect(novo.streak).toBe(1);
  });

  it('não infla se o dia já estava contabilizado', () => {
    const novo = applyMetGoal({
      ...BASE,
      lastMetDate: '2026-07-28',
      date: '2026-07-28',
      days: {},
      restDay: null,
    });
    expect(novo.streak).toBe(5);
  });

  it('ganha um congelamento a cada 7 dias, até o teto', () => {
    const seteDias = applyMetGoal({
      ...BASE,
      streak: 6,
      date: '2026-07-28',
      days: {},
      restDay: null,
    });
    expect(seteDias.streak).toBe(DIAS_POR_FREEZE);
    expect(seteDias.gainedFreeze).toBe(true);
    expect(seteDias.freezesAvailable).toBe(1);

    const noTeto = applyMetGoal({
      ...BASE,
      streak: 13,
      freezesAvailable: MAX_FREEZES,
      date: '2026-07-28',
      days: {},
      restDay: null,
    });
    expect(noTeto.gainedFreeze).toBe(false);
    expect(noTeto.freezesAvailable).toBe(MAX_FREEZES);
  });

  it('um congelamento usado ontem mantém a sequência viva', () => {
    const novo = applyMetGoal({
      ...BASE,
      lastMetDate: '2026-07-26',
      freezesUsedOn: ['2026-07-27'],
      date: '2026-07-28',
      days: {},
      restDay: null,
    });
    expect(novo.streak).toBe(6);
  });
});

describe('revertMetGoal', () => {
  it('desfaz o dia quando o registro é apagado', () => {
    const novo = revertMetGoal({ ...BASE, lastMetDate: '2026-07-28', streak: 6, date: '2026-07-28' });
    expect(novo.streak).toBe(5);
    expect(novo.lastMetDate).toBe('2026-07-27');
  });

  it('ignora quando o dia apagado não era o último cumprido', () => {
    const novo = revertMetGoal({ ...BASE, date: '2026-07-20' });
    expect(novo).toEqual(BASE);
  });

  it('não deixa a ofensiva negativa', () => {
    const novo = revertMetGoal({
      ...BASE,
      streak: 0,
      lastMetDate: '2026-07-28',
      date: '2026-07-28',
    });
    expect(novo.streak).toBe(0);
  });

  it('preserva o recorde', () => {
    const novo = revertMetGoal({
      ...BASE,
      streak: 6,
      bestStreak: 20,
      lastMetDate: '2026-07-28',
      date: '2026-07-28',
    });
    expect(novo.bestStreak).toBe(20);
  });
});
