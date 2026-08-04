/**
 * Testes das conquistas.
 *
 * Não existiam, e é por isso que duas conquistas **inalcançáveis** ("Variedade" e "Do
 * seu jeito", que exigiam bebidas que o catálogo não tem) e um critério que mentia
 * ("Semana cheia" prometia checar congelamento e só olhava a ofensiva) sobreviveram até
 * um usuário reclamar.
 *
 * O teste central é `toda conquista é alcançável`: ele constrói o histórico mais
 * completo possível e exige que as 24 abram. Qualquer critério que dependa de algo que o
 * app não registra falha ali.
 */

import { ACHIEVEMENTS_COUNT, achievementsOf } from '@/domain/achievements';
import { GARDEN_ELEMENTS } from '@/domain/garden';
import type { DayLog } from '@/domain/types';
import { recalcDay } from '@/domain/water';

const META = 2500;

/** Horas dos registros: cobre manhã (<9h), meta antes do meio-dia e noturno (>=22h). */
const HORAS = [7, 8, 9, 10, 11, 22];

function diaCheio(date: string): DayLog {
  const [y, m, d] = date.split('-').map(Number);
  return recalcDay({
    date,
    goalMl: META,
    metGoal: false,
    totalHydrationMl: 0,
    entries: HORAS.map((hora, i) => ({
      id: `${date}-${i}`,
      at: new Date(y, m - 1, d, hora, 0).getTime(),
      drinkId: 'agua',
      volumeMl: 500,
      hydrationMl: 500,
    })),
  });
}

function chaveMais(base: string, dias: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const p = new Date(y, m - 1, d + dias);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${String(p.getDate()).padStart(2, '0')}`;
}

/**
 * Histórico "tudo feito": 400 dias seguidos cumpridos, um intervalo de dez dias e mais
 * um dia cumprido depois. O bloco longo dá mês redondo e sequência limpa; o intervalo
 * seguido de retorno dá a conquista de retomada.
 */
function historicoCompleto(): { days: Record<string, DayLog>; hoje: string } {
  const inicio = '2024-01-01';
  const days: Record<string, DayLog> = {};

  for (let i = 0; i < 400; i += 1) {
    const date = chaveMais(inicio, i);
    days[date] = diaCheio(date);
  }
  const retorno = chaveMais(inicio, 410);
  days[retorno] = diaCheio(retorno);

  return { days, hoje: chaveMais(inicio, 420) };
}

const TUDO = {
  ...historicoCompleto(),
  bestStreak: 365,
  gardenUnlocked: GARDEN_ELEMENTS.map((e) => e.id),
  gardenTotal: GARDEN_ELEMENTS.length,
};

const VAZIO = {
  days: {},
  bestStreak: 0,
  gardenUnlocked: [],
  gardenTotal: GARDEN_ELEMENTS.length,
  hoje: '2026-08-04',
};

describe('achievementsOf — estrutura', () => {
  it('tem a quantidade declarada, e ids únicos', () => {
    const lista = achievementsOf(VAZIO);
    expect(lista).toHaveLength(ACHIEVEMENTS_COUNT);
    expect(new Set(lista.map((c) => c.id)).size).toBe(lista.length);
  });

  it('nenhum ícone repete', () => {
    // Numa grade de 24 blocos, dois ícones iguais viram o mesmo bloco aos olhos de quem
    // passa a vista. Já aconteceu com `flame` em "3 dias" e "1 semana".
    const icones = achievementsOf(VAZIO).map((c) => c.icon);
    expect(new Set(icones).size).toBe(icones.length);
  });

  it('nenhum critério cita bebida que o app não tem', () => {
    // O catálogo só tem água. Critério que fale de café, chá ou bebida personalizada é
    // promessa que o app não cumpre.
    for (const c of achievementsOf(TUDO)) {
      expect(c.criterion.toLowerCase()).not.toMatch(
        /café|cha\b|chá|suco|refrigerante|personalizada|variedade|bebidas diferentes/,
      );
      expect(c.title).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    }
  });

  it('progress fica sempre em 0..1', () => {
    for (const entrada of [VAZIO, TUDO]) {
      for (const c of achievementsOf(entrada)) {
        if (c.progress === undefined) continue;
        expect(c.progress).toBeGreaterThanOrEqual(0);
        expect(c.progress).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('achievementsOf — alcançabilidade', () => {
  it('nada abre num histórico vazio', () => {
    expect(achievementsOf(VAZIO).filter((c) => c.unlocked)).toHaveLength(0);
  });

  it('toda conquista é alcançável', () => {
    // ESTE é o teste que pega critério morto. Se alguém acrescentar uma conquista que
    // dependa de dado que o app não registra, ela aparece aqui.
    const travadas = achievementsOf(TUDO)
      .filter((c) => !c.unlocked)
      .map((c) => `${c.id} (${c.criterion})`);

    expect(travadas).toEqual([]);
  });
});

describe('achievementsOf — não regride', () => {
  it('a ofensiva perdida não fecha conquista já aberta', () => {
    // `bestStreak` é o recorde. Com a ofensiva corrente, quem chegava a 30 dias e
    // perdia a sequência via "30 dias" voltar para cinza — o app tirando de volta algo
    // conquistado, o oposto da regra de nunca punir.
    const comRecorde = achievementsOf({ ...VAZIO, bestStreak: 30 });
    const abertas = comRecorde.filter((c) => c.unlocked).map((c) => c.id);

    expect(abertas).toContain('streak-3');
    expect(abertas).toContain('streak-7');
    expect(abertas).toContain('streak-30');
    expect(abertas).not.toContain('streak-100');
  });
});

describe('achievementsOf — critérios que já mentiram', () => {
  it('"Semana cheia" não é a mesma coisa que "1 semana"', () => {
    // A ofensiva aceita dia congelado; "Semana cheia" não. Recorde de 7 dias **sem**
    // sete dias cumpridos no histórico abre uma e não a outra.
    const lista = achievementsOf({ ...VAZIO, bestStreak: 7 });
    const de = (id: string) => lista.find((c) => c.id === id);

    expect(de('streak-7')?.unlocked).toBe(true);
    expect(de('semana-cheia')?.unlocked).toBe(false);
  });

  it('"Mês redondo" ignora o mês em curso', () => {
    // Um mês incompleto ainda pode ser perdido, então premiá-lo seria adiantar-se.
    const days: Record<string, DayLog> = {};
    for (let i = 0; i < 10; i += 1) {
      const date = `2026-08-${String(i + 1).padStart(2, '0')}`;
      days[date] = diaCheio(date);
    }

    const emCurso = achievementsOf({ ...VAZIO, days, hoje: '2026-08-10' });
    expect(emCurso.find((c) => c.id === 'mes-redondo')?.unlocked).toBe(false);
  });

  it('"De volta" exige o intervalo, não só dois dias cumpridos', () => {
    const seguidos: Record<string, DayLog> = {
      '2026-08-01': diaCheio('2026-08-01'),
      '2026-08-02': diaCheio('2026-08-02'),
    };
    expect(
      achievementsOf({ ...VAZIO, days: seguidos, hoje: '2026-08-05' }).find(
        (c) => c.id === 'retomada',
      )?.unlocked,
    ).toBe(false);

    const comIntervalo: Record<string, DayLog> = {
      '2026-07-01': diaCheio('2026-07-01'),
      '2026-07-20': diaCheio('2026-07-20'),
    };
    expect(
      achievementsOf({ ...VAZIO, days: comIntervalo, hoje: '2026-08-05' }).find(
        (c) => c.id === 'retomada',
      )?.unlocked,
    ).toBe(true);
  });
});
