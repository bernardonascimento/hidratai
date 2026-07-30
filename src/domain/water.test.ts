import type { DayLog, Entry } from '@/domain/types';
import {
  emptyDay,
  hydrationMlOf,
  pruneDays,
  recalcDay,
  totalVolumeOf,
} from '@/domain/water';

function entry(volumeMl: number, hydration = 1): Entry {
  return {
    id: `e-${volumeMl}-${hydration}`,
    at: new Date(2026, 6, 28, 10, 0).getTime(),
    drinkId: 'agua',
    volumeMl,
    hydrationMl: hydrationMlOf(volumeMl, hydration),
  };
}

describe('hydrationMlOf', () => {
  it('aplica o fator e arredonda (§4.2)', () => {
    expect(hydrationMlOf(80, 0.8)).toBe(64); // o café do aceite da F2
    expect(hydrationMlOf(350, 0.4)).toBe(140);
    expect(hydrationMlOf(50, 0)).toBe(0);
    expect(hydrationMlOf(200, 0.85)).toBe(170);
  });
});

describe('recalcDay', () => {
  it('soma a hidratação e decide metGoal', () => {
    const dia = recalcDay({ ...emptyDay('2026-07-28', 2000), entries: [entry(1500), entry(500)] });
    expect(dia.totalHydrationMl).toBe(2000);
    expect(dia.metGoal).toBe(true);
  });

  it('não bate a meta por um ml', () => {
    const dia = recalcDay({ ...emptyDay('2026-07-28', 2000), entries: [entry(1999)] });
    expect(dia.metGoal).toBe(false);
  });

  it('separa líquido total de água efetiva', () => {
    const entries = [entry(80, 0.8), entry(350, 0.4)];
    const dia = recalcDay({ ...emptyDay('2026-07-28', 2000), entries });
    expect(totalVolumeOf(entries)).toBe(430);
    expect(dia.totalHydrationMl).toBe(204);
  });

  it('é idempotente', () => {
    const base = recalcDay({ ...emptyDay('2026-07-28', 2000), entries: [entry(500)] });
    expect(recalcDay(base)).toEqual(base);
  });
});

describe('pruneDays', () => {
  function days(total: number): Record<string, DayLog> {
    const resultado: Record<string, DayLog> = {};
    for (let i = 0; i < total; i += 1) {
      const data = new Date(2020, 0, 1 + i);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
        data.getDate(),
      ).padStart(2, '0')}`;
      resultado[chave] = emptyDay(chave, 2000);
    }
    return resultado;
  }

  it('não toca em nada abaixo do limite', () => {
    const entrada = days(10);
    expect(pruneDays(entrada, 400)).toBe(entrada);
  });

  it('mantém os N dias mais recentes', () => {
    const podado = pruneDays(days(410), 400);
    const chaves = Object.keys(podado).sort();
    expect(chaves).toHaveLength(400);
    expect(chaves[0]).toBe('2020-01-11');
  });
});
