import { WATER_DRINK_ID } from '@/domain/drinks';
import { dayKeyOf, middayOf } from '@/lib/date';
import { WATER_VERSION, migrateWater } from '@/store/waterMigrations';

/**
 * Snapshot real do formato v0 — o shape que `useWater` gravava antes da migração:
 * `porDia` com `{ id, ml, at }` e a gamificação solta na raiz.
 */
const V0 = {
  metaMl: 2000,
  xp: 110,
  streak: 1,
  ultimoDiaMeta: '2026-07-27',
  porDia: {
    '2026-07-27': [
      { id: '2026-07-27-1', ml: 500, at: new Date(2026, 6, 27, 8, 15).getTime() },
      { id: '2026-07-27-2', ml: 500, at: new Date(2026, 6, 27, 11, 0).getTime() },
      { id: '2026-07-27-3', ml: 300, at: new Date(2026, 6, 27, 14, 30).getTime() },
      { id: '2026-07-27-4', ml: 300, at: new Date(2026, 6, 27, 17, 0).getTime() },
      { id: '2026-07-27-5', ml: 300, at: new Date(2026, 6, 27, 19, 45).getTime() },
      { id: '2026-07-27-6', ml: 200, at: new Date(2026, 6, 27, 21, 30).getTime() },
    ],
    '2026-07-26': [{ id: '2026-07-26-1', ml: 750, at: new Date(2026, 6, 26, 9, 0).getTime() }],
    // Lixo que o "desfazer" da v0 deixava para trás.
    '2026-07-25': [],
  },
};

describe('migrateWater v0 -> v1', () => {
  it('não perde nenhum registro nem volume', () => {
    const v1 = migrateWater(V0, 0);

    const totalAntigo = Object.values(V0.porDia)
      .flat()
      .reduce((soma, e) => soma + e.ml, 0);
    const totalNovo = Object.values(v1.days)
      .flatMap((d) => d.entries)
      .reduce((soma, e) => soma + e.volumeMl, 0);

    expect(totalNovo).toBe(totalAntigo);
    expect(Object.values(v1.days).flatMap((d) => d.entries)).toHaveLength(7);
  });

  it('converte cada registro em Entry de água com fator 1.0', () => {
    const v1 = migrateWater(V0, 0);
    const entry = v1.days['2026-07-27'].entries[0];

    expect(entry).toMatchObject({
      id: '2026-07-27-1',
      drinkId: WATER_DRINK_ID,
      volumeMl: 500,
      hydrationMl: 500,
    });
    expect(entry.at).toBe(new Date(2026, 6, 27, 8, 15).getTime());
  });

  it('recalcula os derivados do dia e congela a meta', () => {
    const v1 = migrateWater(V0, 0);

    expect(v1.days['2026-07-27']).toMatchObject({
      date: '2026-07-27',
      goalMl: 2000,
      totalHydrationMl: 2100,
      metGoal: true,
    });
    expect(v1.days['2026-07-26']).toMatchObject({ totalHydrationMl: 750, metGoal: false });
  });

  it('descarta dias sem registros', () => {
    const v1 = migrateWater(V0, 0);
    expect(v1.days['2026-07-25']).toBeUndefined();
    expect(Object.keys(v1.days).sort()).toEqual(['2026-07-26', '2026-07-27']);
  });

  it('preserva a gamificação da v0', () => {
    const v1 = migrateWater(V0, 0);
    expect(v1).toMatchObject({ xp: 110, streak: 1, lastMetDate: '2026-07-27', goalMl: 2000 });
    expect(v1.lastDrinkId).toBe(WATER_DRINK_ID);
  });

  it('usa meio-dia local quando o registro antigo não tem hora', () => {
    const v1 = migrateWater({ porDia: { '2026-07-20': [{ id: 'x', ml: 250 }] } }, 0);
    const entry = v1.days['2026-07-20'].entries[0];

    expect(entry.at).toBe(middayOf('2026-07-20'));
    // Meio-dia cai no mesmo dia lógico, não no anterior.
    expect(dayKeyOf(entry.at)).toBe('2026-07-20');
  });

  it('reagrupa a madrugada no dia lógico anterior', () => {
    // A v0 fechava o dia à meia-noite: este copo foi gravado no dia 28.
    const v1 = migrateWater(
      {
        porDia: {
          '2026-07-28': [
            { id: 'madrugada', ml: 250, at: new Date(2026, 6, 28, 1, 30).getTime() },
            { id: 'manha', ml: 300, at: new Date(2026, 6, 28, 9, 0).getTime() },
          ],
        },
      },
      0,
    );

    expect(v1.days['2026-07-27'].entries.map((e) => e.id)).toEqual(['madrugada']);
    expect(v1.days['2026-07-28'].entries.map((e) => e.id)).toEqual(['manha']);
  });

  it('ordena os registros do dia por horário', () => {
    const v1 = migrateWater(
      {
        porDia: {
          '2026-07-28': [
            { id: 'tarde', ml: 200, at: new Date(2026, 6, 28, 18, 0).getTime() },
            { id: 'manha', ml: 200, at: new Date(2026, 6, 28, 8, 0).getTime() },
          ],
        },
      },
      0,
    );

    expect(v1.days['2026-07-28'].entries.map((e) => e.id)).toEqual(['manha', 'tarde']);
  });

  it('sobrevive a dado ausente ou corrompido', () => {
    expect(migrateWater(undefined, 0).days).toEqual({});
    expect(migrateWater(null, 0).goalMl).toBe(2000);
    expect(migrateWater({ porDia: { '2026-07-01': [{ id: 'a' }] } }, 0).days).toEqual({});
  });

  it('não mexe em dado que já está na versão atual', () => {
    const v1 = migrateWater(V0, 0);
    expect(migrateWater(v1, WATER_VERSION)).toBe(v1);
  });
});
