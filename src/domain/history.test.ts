import {
  firstMonthWithData,
  monthGrid,
  monthLabel,
  shiftMonth,
  shortDate,
  statsOf,
  weekSlots,
  weekdayFull,
  weekdayShort,
  yearMonths,
  yearsWithData,
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

describe('dia livre no calendário', () => {
  // 2026-07-28 é uma terça. A semana do calendário vai de 2026-07-27 (segunda) a
  // 2026-08-02 (domingo), então há exatamente um domingo na janela.
  const HOJE = '2026-07-28';
  const DOMINGO = 0;

  it('weekSlots marca o dia livre e só ele', () => {
    const slots = weekSlots(DAYS, 2000, HOJE, DOMINGO);
    const marcados = slots.filter((s) => s.restDay);

    expect(marcados).toHaveLength(1);
    expect(weekdayFull(marcados[0].date)).toBe('domingo');
  });

  it('sem dia livre, nenhum slot vem marcado', () => {
    for (const s of weekSlots(DAYS, 2000, HOJE, null)) expect(s.restDay).toBe(false);
    for (const s of monthGrid(DAYS, 2000, HOJE, null).slots) expect(s.restDay).toBe(false);
  });

  it('monthGrid marca todos os domingos do mês', () => {
    const slots = monthGrid(DAYS, 2000, HOJE, DOMINGO).slots;
    const marcados = slots.filter((s) => s.restDay);

    // Julho de 2026 tem 31 dias; entre 4 e 5 domingos, nunca outro dia.
    expect(marcados.length).toBeGreaterThanOrEqual(4);
    for (const s of marcados) expect(weekdayFull(s.date)).toBe('domingo');
  });

  it('dia livre com registro continua contando como dia com água', () => {
    // A marca é sobre a folga, não sobre o volume: quem bebeu no dia livre tem de
    // aparecer com água no calendário, senão o registro desaparece da vista.
    const comAgua = { ...DAYS, '2026-08-02': dia('2026-08-02', 2100) };
    const domingo = weekSlots(comAgua, 2000, HOJE, DOMINGO).find((s) => s.restDay);

    expect(domingo?.restDay).toBe(true);
    expect(domingo?.empty).toBe(false);
    expect(domingo?.metGoal).toBe(true);
  });

  it('não altera as estatísticas', () => {
    // Marcar é visual. Excluir o dia livre da média e das metas batidas seria outra
    // decisão, e mudaria número que o usuário já vê hoje.
    const com = statsOf(weekSlots(DAYS, 2000, HOJE, DOMINGO));
    const sem = statsOf(weekSlots(DAYS, 2000, HOJE, null));
    expect(com).toEqual(sem);
  });
});

describe('vista de Ano em mais de um ano', () => {
  /** Dois anos de dado: dezembro de 2025 e janeiro de 2026. */
  const DOIS_ANOS: Record<string, DayLog> = {
    '2025-12-10': dia('2025-12-10', 2200),
    '2025-12-20': dia('2025-12-20', 1800),
    '2026-01-05': dia('2026-01-05', 2000),
  };

  it('o ano anterior continua alcançável em 1º de janeiro', () => {
    /**
     * ESTE é o defeito que a feature conserta. Antes, `yearMonths` fixava o ano em
     * `hoje`: no dia 1º de janeiro a aba abria vazia e dezembro ficava invisível para
     * sempre, com o dado no disco e nenhuma tela capaz de mostrá-lo.
     */
    const dezembro = yearMonths(DOIS_ANOS, '2026-01-01', 2025).find(
      (m) => m.month === '2025-12',
    );

    expect(dezembro?.daysTracked).toBe(2);
    expect(dezembro?.averageMl).toBe(2000);
  });

  it('sem o ano explícito, segue mostrando o ano corrente', () => {
    const meses = yearMonths(DOIS_ANOS, '2026-01-01');
    expect(meses.every((m) => m.month.startsWith('2026'))).toBe(true);
  });

  it('ano passado não tem mês futuro', () => {
    // O ano inteiro já aconteceu, então marcar dezembro como "ainda não chegou" seria
    // apagá-lo do gráfico com o tom fraco de mês futuro.
    const meses = yearMonths(DOIS_ANOS, '2026-01-01', 2025);
    expect(meses.some((m) => m.future)).toBe(false);
  });

  it('ano corrente marca como futuro só o que vem depois de hoje', () => {
    const meses = yearMonths(DOIS_ANOS, '2026-03-15', 2026);
    expect(meses.filter((m) => m.future).map((m) => m.label)).toEqual([
      'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez',
    ]);
  });

  it('yearsWithData lista os anos com dado, em ordem, com o corrente sempre presente', () => {
    expect(yearsWithData(DOIS_ANOS, '2026-01-01')).toEqual([2025, 2026]);
    // Sem registro nenhum, o ano de hoje ainda tem de aparecer: é o que a aba abre, e
    // uma lista vazia deixaria o seletor sem nada para selecionar.
    expect(yearsWithData({}, '2026-01-01')).toEqual([2026]);
  });

  it('um ano só de dado não oferece navegação', () => {
    // É o que faz o seletor não aparecer no primeiro ano de uso.
    const soEsteAno = { '2026-01-05': dia('2026-01-05', 2000) };
    expect(yearsWithData(soEsteAno, '2026-03-01')).toHaveLength(1);
  });
});

describe('navegação por mês', () => {
  it('shiftMonth vira o ano nas duas direções', () => {
    // Dezembro→janeiro e janeiro→dezembro são exatamente onde a conta à mão erra.
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-03', -5)).toBe('2025-10');
  });

  it('monthGrid mostra o mês pedido, não o de hoje', () => {
    const days = { '2025-12-10': dia('2025-12-10', 2200) };
    const grade = monthGrid(days, 2000, '2026-02-15', null, '2025-12');

    expect(grade.month).toBe('2025-12');
    expect(grade.slots).toHaveLength(31);
    expect(grade.slots.find((s) => s.date === '2025-12-10')?.hydrationMl).toBe(2200);
  });

  it('mês passado não tem dia futuro', () => {
    const grade = monthGrid({}, 2000, '2026-02-15', null, '2025-12');
    expect(grade.slots.some((s) => s.future)).toBe(false);
  });

  it('firstMonthWithData acha o mês mais antigo, e cai no corrente sem dado', () => {
    const days = {
      '2026-03-02': dia('2026-03-02', 1000),
      '2025-11-30': dia('2025-11-30', 1000),
    };
    expect(firstMonthWithData(days, '2026-08-04')).toBe('2025-11');
    expect(firstMonthWithData({}, '2026-08-04')).toBe('2026-08');
  });

  it('monthLabel escreve o mês por extenso com o ano', () => {
    expect(monthLabel('2026-08')).toBe('agosto de 2026');
    expect(monthLabel('2025-12')).toBe('dezembro de 2025');
  });
});
