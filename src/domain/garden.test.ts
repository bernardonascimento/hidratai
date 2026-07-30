import {
  GARDEN_ELEMENTS,
  affordable,
  elementById,
  nextTarget,
  sceneElements,
  totalCost,
} from '@/domain/garden';
import { milestonesOf, shareText } from '@/domain/milestones';
import type { DayLog } from '@/domain/types';
import { emptyDay, recalcDay } from '@/domain/water';

describe('catálogo do Cantinho', () => {
  it('tem ids únicos', () => {
    const ids = GARDEN_ELEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('os custos crescem e começam acessíveis', () => {
    const custos = GARDEN_ELEMENTS.map((e) => e.cost);
    expect(Math.min(...custos)).toBeLessThanOrEqual(2);
    // Nada absurdo: o mais caro cabe em alguns meses de consistência.
    expect(Math.max(...custos)).toBeLessThanOrEqual(60);
  });

  it('todas as posições ficam dentro do cenário', () => {
    for (const e of GARDEN_ELEMENTS) {
      expect(e.x).toBeGreaterThanOrEqual(0);
      expect(e.x).toBeLessThanOrEqual(1);
      expect(e.y).toBeGreaterThanOrEqual(0);
      expect(e.y).toBeLessThanOrEqual(1);
    }
  });

  it('elementById acha e não inventa', () => {
    expect(elementById('muda')?.name).toBe('Muda');
    expect(elementById('inexistente')).toBeUndefined();
  });

  it('affordable respeita gotas e o que já foi desbloqueado', () => {
    const comCinco = affordable(5, []);
    expect(comCinco.every((e) => e.cost <= 5)).toBe(true);
    // ordenado do mais barato ao mais caro
    expect(comCinco.map((e) => e.cost)).toEqual([...comCinco.map((e) => e.cost)].sort((a, b) => a - b));

    const jaTemMuda = affordable(5, ['muda']);
    expect(jaTemMuda.find((e) => e.id === 'muda')).toBeUndefined();
  });

  it('nextTarget é o mais barato que falta', () => {
    expect(nextTarget([])?.id).toBe('muda');
    expect(nextTarget(['muda'])?.id).toBe('pedrinhas');
  });

  it('nextTarget devolve undefined quando tudo foi desbloqueado', () => {
    expect(nextTarget(GARDEN_ELEMENTS.map((e) => e.id))).toBeUndefined();
  });

  it('sceneElements devolve só o desbloqueado, em ordem de camada', () => {
    const cena = sceneElements(['sol', 'muda', 'pedrinhas']);
    expect(cena.map((e) => e.id).sort()).toEqual(['muda', 'pedrinhas', 'sol']);
    const camadas = cena.map((e) => e.layer);
    expect(camadas).toEqual([...camadas].sort((a, b) => a - b));
  });

  it('o custo total dá um horizonte de meses, não de dias', () => {
    expect(totalCost()).toBeGreaterThan(60);
  });
});

describe('marcos de vida', () => {
  function days(qtdDias: number, registrosPorDia: number): Record<string, DayLog> {
    const out: Record<string, DayLog> = {};
    for (let i = 0; i < qtdDias; i += 1) {
      const date = `2026-07-${String(i + 1).padStart(2, '0')}`;
      out[date] = recalcDay({
        ...emptyDay(date, 2000),
        entries: Array.from({ length: registrosPorDia }, (_, j) => ({
          id: `${date}-${j}`,
          at: new Date(2026, 6, i + 1, 9 + j).getTime(),
          drinkId: 'agua',
          volumeMl: 300,
          hydrationMl: 300,
        })),
      });
    }
    return out;
  }

  it('conta litros, dias e registros', () => {
    const marcos = milestonesOf({ lifetimeMl: 47300, days: days(5, 3) });
    const litros = marcos.find((m) => m.id === 'litros');
    const dias = marcos.find((m) => m.id === 'dias');
    const registros = marcos.find((m) => m.id === 'registros');

    expect(litros?.current).toBe(47.3);
    expect(dias?.current).toBe(5);
    expect(registros?.current).toBe(15);
  });

  it('aponta o próximo alvo acima do valor atual', () => {
    const marcos = milestonesOf({ lifetimeMl: 47300, days: days(5, 3) });
    const litros = marcos.find((m) => m.id === 'litros');
    expect(litros?.target).toBe(50);
    expect(litros?.reached).toBe(false);
  });

  it('marca como alcançado no último patamar', () => {
    const marcos = milestonesOf({ lifetimeMl: 1_200_000, days: days(1, 1) });
    expect(marcos.find((m) => m.id === 'litros')?.reached).toBe(true);
  });

  it('não quebra sem histórico', () => {
    const marcos = milestonesOf({ lifetimeMl: 0, days: {} });
    expect(marcos.every((m) => m.current === 0)).toBe(true);
  });

  it('dias vazios não contam como dia registrado', () => {
    const comVazio = { '2026-07-01': emptyDay('2026-07-01', 2000) };
    expect(milestonesOf({ lifetimeMl: 0, days: comVazio }).find((m) => m.id === 'dias')?.current).toBe(0);
  });
});

describe('texto de compartilhamento', () => {
  it('cita litros e ofensiva atual', () => {
    const texto = shareText({ lifetimeMl: 47300, streak: 5, bestStreak: 9 });
    expect(texto).toContain('47,3 L');
    expect(texto).toContain('5 dias');
  });

  it('usa o recorde quando a ofensiva está zerada', () => {
    const texto = shareText({ lifetimeMl: 10000, streak: 0, bestStreak: 9 });
    expect(texto).toContain('recorde');
    expect(texto).toContain('9 dias');
  });

  it('não vaza dado pessoal nem link', () => {
    const texto = shareText({ lifetimeMl: 5000, streak: 1, bestStreak: 1 });
    expect(texto).not.toMatch(/http|kg|@/);
  });
});
