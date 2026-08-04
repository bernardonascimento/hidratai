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
    // O primeiro item tem de cair no primeiro ou segundo dia, ou ninguém entende a
    // mecânica antes de desistir dela.
    expect(Math.min(...custos)).toBeLessThanOrEqual(2);
    /**
     * Teto de 80, não os 60 de antes.
     *
     * Os 60 estavam calibrados para o catálogo de 12 elementos. Com 24 e horizonte de
     * dois anos, a peça final precisa custar caro — é ela que dá o que perseguir no
     * segundo ano. 80 gotas são ~16 semanas a cinco dias por semana: longo, e alcançável.
     */
    expect(Math.max(...custos)).toBeLessThanOrEqual(80);
  });

  it('nenhum par de elementos ocupa exatamente a mesma posição', () => {
    // Com 24 peças a chance de colisão por descuido é real, e duas no mesmo ponto
    // deixam uma invisível para sempre atrás da outra.
    const pontos = GARDEN_ELEMENTS.map((e) => `${e.x},${e.y}`);
    expect(new Set(pontos).size).toBe(pontos.length);
  });

  it('deixa livre o vão onde a Gotinha mora', () => {
    /**
     * A Gotinha é desenhada **por cima** de tudo, com 92pt e centrada. Peça posicionada
     * atrás dela é gota paga por algo que não se vê.
     *
     * O retângulo sai da posição real no `GardenScene`: `bottom-14` são 56pt do fundo, e
     * num cenário de ~303×250 isso dá x de 0.35 a 0.65 e y de 0.41 a 0.78. **Se ela
     * subir ou descer no componente, estes números mudam** — já mudaram uma vez, quando
     * ela foi de `bottom-6` para `bottom-14`, e este teste apontou a poça como se fosse
     * defeito quando na verdade a peça tinha ficado abaixo dos pés dela.
     */
    const naFrenteDela = GARDEN_ELEMENTS.filter(
      (e) => e.x > 0.35 && e.x < 0.65 && e.y > 0.41 && e.y < 0.78,
    ).map((e) => `${e.id} (${e.x}, ${e.y})`);

    expect(naFrenteDela).toEqual([]);
  });

  it('todas as posições ficam dentro do cenário', () => {
    for (const e of GARDEN_ELEMENTS) {
      expect(e.x).toBeGreaterThanOrEqual(0);
      expect(e.x).toBeLessThanOrEqual(1);
      expect(e.y).toBeGreaterThanOrEqual(0);
      expect(e.y).toBeLessThanOrEqual(1);
    }
  });

  it('nenhuma peça é cortada pela borda lateral', () => {
    /**
     * O centro dentro da caixa não basta: a peça é desenhada **centrada** em `x`, com
     * 84pt × `scale` de largura num cenário de ~303pt. Metade da peça é 0.139×`scale` da
     * largura, e `x` menor que isso corta o desenho ao meio.
     *
     * Quatro peças nasceram cortadas — `trepadeira` em 0.04, `samambaia` em 0.06,
     * `regador` em 0.96 e `cacto` em 0.92 — e o teste anterior aprovava, porque só olhava
     * se o centro caía entre 0 e 1.
     *
     * `MEIA_PECA` é 0.10 e não 0.139 porque **nenhum desenho preenche o quadro de
     * 100×100**: todos ficam nos ~70% centrais, com margem interna. Usar a metade
     * geométrica reprovava peças que na tela estavam inteiras — girassol em x=0.10 e
     * samambaia em 0.92 foram aprovadas visualmente e o teste as acusava.
     *
     * Isto é um modelo, não uma medida: se algum desenho novo chegar às bordas do
     * próprio quadro, o número aqui deixa de valer para ele.
     */
    const MEIA_PECA = 0.1;
    const TOLERANCIA = 0.02;

    const cortadas = GARDEN_ELEMENTS.filter((e) => {
      const meia = MEIA_PECA * e.scale;
      return e.x - meia < -TOLERANCIA || e.x + meia > 1 + TOLERANCIA;
    }).map((e) => `${e.id} (x ${e.x}, scale ${e.scale})`);

    expect(cortadas).toEqual([]);
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
    /**
     * Verifica a **propriedade**, não um id fixo. A versão anterior cravava
     * `nextTarget(['muda']) === 'pedrinhas'`, e quebrou ao acrescentar um elemento mais
     * barato — falhando por o catálogo ter mudado, não por o código estar errado.
     */
    const porCusto = [...GARDEN_ELEMENTS].sort((a, b) => a.cost - b.cost);
    expect(nextTarget([])?.id).toBe(porCusto[0].id);

    const desbloqueados: string[] = [];
    for (const esperado of porCusto) {
      expect(nextTarget(desbloqueados)?.id).toBe(esperado.id);
      desbloqueados.push(esperado.id);
    }
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
