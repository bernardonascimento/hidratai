import {
  MISSAO_ANCORA,
  MISSIONS,
  XP_DIA_PERFEITO,
  isDiaPerfeito,
  missionStatus,
  missionsForDay,
  missionsXp,
} from '@/domain/missions';
import type { DayLog, Entry } from '@/domain/types';
import { emptyDay, recalcDay } from '@/domain/water';

const DATA = '2026-07-28';

function às(hora: number, minuto = 0): number {
  return new Date(2026, 6, 28, hora, minuto).getTime();
}

function entrada(hora: number, ml = 300): Entry {
  return {
    id: `e-${hora}`,
    at: às(hora),
    drinkId: 'agua',
    volumeMl: ml,
    hydrationMl: ml,
  };
}

function dia(entries: Entry[], goalMl = 2000): DayLog {
  return recalcDay({ ...emptyDay(DATA, goalMl), entries });
}

describe('missionsForDay', () => {
  it('sempre devolve três, com a meta como âncora', () => {
    const ids = missionsForDay(DATA);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe(MISSAO_ANCORA);
  });

  it('é determinístico: a mesma data sorteia as mesmas missões', () => {
    expect(missionsForDay(DATA)).toEqual(missionsForDay(DATA));
  });

  it('datas diferentes tendem a sortear conjuntos diferentes', () => {
    const semana = ['2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01'].map(
      (d) => missionsForDay(d).join(','),
    );
    // Não exigimos todas distintas, mas não pode ser tudo igual.
    expect(new Set(semana).size).toBeGreaterThan(1);
  });

  it('não repete as missões de ontem', () => {
    const ontem = missionsForDay('2026-07-27');
    const hoje = missionsForDay(DATA, ontem);
    const sorteadasHoje = hoje.filter((id) => id !== MISSAO_ANCORA);
    const sorteadasOntem = ontem.filter((id) => id !== MISSAO_ANCORA);

    for (const id of sorteadasHoje) {
      expect(sorteadasOntem).not.toContain(id);
    }
  });

  it('não devolve menos de três quando quase tudo foi excluído', () => {
    const todas = Object.keys(MISSIONS).filter((id) => id !== MISSAO_ANCORA) as never;
    const ids = missionsForDay(DATA, todas);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it('nunca repete a mesma missão no dia', () => {
    for (const d of ['2026-01-01', '2026-06-15', '2026-12-31', '2027-03-08']) {
      const ids = missionsForDay(d);
      expect(new Set(ids).size).toBe(3);
    }
  });
});

describe('critérios das missões', () => {
  it('bom dia: registro antes das 9h', () => {
    expect(MISSIONS['bom-dia'].isDone({ day: dia([entrada(8)]) })).toBe(true);
    expect(MISSIONS['bom-dia'].isDone({ day: dia([entrada(9)]) })).toBe(false);
  });

  it('ao longo do dia: quatro registros', () => {
    const tres = dia([entrada(8), entrada(12), entrada(16)]);
    const quatro = dia([entrada(8), entrada(12), entrada(16), entrada(20)]);
    expect(MISSIONS['ao-longo-do-dia'].isDone({ day: tres })).toBe(false);
    expect(MISSIONS['ao-longo-do-dia'].isDone({ day: quatro })).toBe(true);
  });

  it('depois do almoço: entre 13h e 15h', () => {
    expect(MISSIONS['depois-do-almoco'].isDone({ day: dia([entrada(13)]) })).toBe(true);
    expect(MISSIONS['depois-do-almoco'].isDone({ day: dia([entrada(14, 59)]) })).toBe(true);
    expect(MISSIONS['depois-do-almoco'].isDone({ day: dia([entrada(15)]) })).toBe(false);
    expect(MISSIONS['depois-do-almoco'].isDone({ day: dia([entrada(12)]) })).toBe(false);
  });

  it('fim de tarde: depois das 20h', () => {
    expect(MISSIONS['antes-de-dormir'].isDone({ day: dia([entrada(20)]) })).toBe(true);
    expect(MISSIONS['antes-de-dormir'].isDone({ day: dia([entrada(19)]) })).toBe(false);
  });

  it('sem pressa: manhã, tarde e noite', () => {
    expect(MISSIONS['sem-pressa'].isDone({ day: dia([entrada(8), entrada(14)]) })).toBe(false);
    expect(
      MISSIONS['sem-pressa'].isDone({ day: dia([entrada(8), entrada(14), entrada(19)]) }),
    ).toBe(true);
  });

  it('dia completo: só quando a meta é batida', () => {
    expect(MISSIONS['dia-completo'].isDone({ day: dia([entrada(8, 500)]) })).toBe(false);
    expect(MISSIONS['dia-completo'].isDone({ day: dia([entrada(8, 2000)]) })).toBe(true);
  });

  it('constante: hoje e ontem', () => {
    const cumprido = dia([entrada(8, 2000)]);
    const nao = dia([entrada(8, 500)]);
    expect(MISSIONS.constante.isDone({ day: cumprido, previousDay: nao })).toBe(false);
    expect(MISSIONS.constante.isDone({ day: cumprido, previousDay: cumprido })).toBe(true);
    expect(MISSIONS.constante.isDone({ day: cumprido, previousDay: undefined })).toBe(false);
  });

  it('nenhum critério fica verdadeiro num dia sem registro', () => {
    for (const missao of Object.values(MISSIONS)) {
      expect(missao.isDone({ day: undefined })).toBe(false);
    }
  });

  it('nenhuma missão recompensa volume acima da meta (§3.1)', () => {
    // Dobrar a meta não muda nada além de "dia-completo", que já estava cumprido.
    const naMeta = dia([entrada(8, 2000)]);
    const dobro = dia([entrada(8, 4000)]);
    for (const missao of Object.values(MISSIONS)) {
      expect(missao.isDone({ day: dobro, previousDay: naMeta })).toBe(
        missao.isDone({ day: naMeta, previousDay: naMeta }),
      );
    }
  });
});

describe('XP das missões', () => {
  it('soma só as cumpridas', () => {
    const status = missionStatus(['dia-completo', 'bom-dia', 'ao-longo-do-dia'], {
      day: dia([entrada(8, 2000)]),
    });
    // dia-completo (25) + bom-dia (15); ao-longo-do-dia não (só 1 registro)
    expect(missionsXp(status)).toBe(40);
    expect(isDiaPerfeito(status)).toBe(false);
  });

  it('acrescenta o bônus quando as três saem', () => {
    const day = dia([entrada(8, 500), entrada(12, 500), entrada(14, 500), entrada(20, 500)]);
    const status = missionStatus(['dia-completo', 'bom-dia', 'ao-longo-do-dia'], { day });
    expect(isDiaPerfeito(status)).toBe(true);
    expect(missionsXp(status)).toBe(25 + 15 + 20 + XP_DIA_PERFEITO);
  });

  it('dia vazio não rende nada', () => {
    const status = missionStatus(missionsForDay(DATA), { day: undefined });
    expect(missionsXp(status)).toBe(0);
    expect(isDiaPerfeito(status)).toBe(false);
  });
});
