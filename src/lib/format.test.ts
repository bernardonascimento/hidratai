import { GOAL_MAX_ML, GOAL_MIN_ML, GOAL_STEP_ML } from '@/domain/goal';
import { formatClock, formatPair, formatVolume } from '@/lib/format';

describe('formatPair', () => {
  it('usa a unidade da meta nos dois lados', () => {
    expect(formatPair(900, 2000)).toEqual({ value: '0,9', total: '2,0', unit: 'L' });
    expect(formatPair(600, 900)).toEqual({ value: '600', total: '900', unit: 'ml' });
  });

  /**
   * O caso real de 05/08/2026: meta 3050 e 3000 bebidos escreviam `3,0 de 3,0 L`, e a
   * garrafa continuava azul — certíssima, porque faltavam 50 ml, e ilegível.
   */
  it('não escreve os dois números iguais quando ainda falta água', () => {
    expect(formatPair(3000, 3050)).toEqual({ value: '3,0', total: '3,1', unit: 'L' });
    expect(formatPair(2950, 3000)).toEqual({ value: '2,9', total: '3,0', unit: 'L' });
  });

  /**
   * A invariante que sustenta a garrafa verde: **se os dois números empatam na tela, a
   * meta foi batida.** É a direção que importa, porque é a leitura que o usuário faz —
   * número igual e garrafa azul não tem explicação possível.
   *
   * A volta não vale sempre, e é de propósito: com meta 3050, beber 3050 escreve
   * `3,0 de 3,1 L` com a garrafa já verde, porque um décimo de litro não expressa 3,05.
   * Meta fora do passo de 100 não é mais alcançável (`clampGoal`), então isso só
   * aparece em estado antigo — e ali errar pela cautela é o certo.
   *
   * Vale para qualquer par, não só para os múltiplos de 100 de hoje: o catálogo de
   * bebidas da F2 traz fator de hidratação e volume quebrado (200 ml de café a 0,8 são
   * 160), e é quando ele entrar que isto começa a trabalhar sozinho.
   */
  it('empatar na tela implica meta batida, para qualquer par', () => {
    for (let meta = GOAL_MIN_ML; meta <= GOAL_MAX_ML; meta += 10) {
      for (let bebido = Math.max(0, meta - 250); bebido <= meta + 50; bebido += 10) {
        const { value, total } = formatPair(bebido, meta);
        if (value === total) expect(bebido).toBeGreaterThanOrEqual(meta);
      }
    }
  });

  /** Nas metas que o app realmente permite, a equivalência é exata nos dois sentidos. */
  it('nas metas do passo de 100, empate na tela é exatamente meta batida', () => {
    for (let meta = GOAL_MIN_ML; meta <= GOAL_MAX_ML; meta += GOAL_STEP_ML) {
      for (let bebido = Math.max(0, meta - 250); bebido <= meta; bebido += 10) {
        const { value, total } = formatPair(bebido, meta);
        expect(value === total).toBe(bebido === meta);
      }
    }
  });

  it('mostra o excedente de quem passou da meta', () => {
    expect(formatPair(3200, 3000)).toEqual({ value: '3,2', total: '3,0', unit: 'L' });
  });

  it('trata o dia sem nada bebido', () => {
    expect(formatPair(0, 2500)).toEqual({ value: '0,0', total: '2,5', unit: 'L' });
  });

  /**
   * `pisoL` conta em décimos inteiros de propósito: `Math.floor(2900 / 1000 * 10)`
   * daria 28 em IEEE-754, porque `2.9 * 10` é 28.999999999999996.
   */
  it('não escorrega no ponto flutuante nos décimos exatos', () => {
    for (let ml = GOAL_MIN_ML; ml <= GOAL_MAX_ML; ml += GOAL_STEP_ML) {
      const { value, total } = formatPair(ml, ml);
      expect(value).toBe(total);
      expect(formatVolume(ml)).toBe(`${total} L`);
    }
  });
});

describe('formatVolume', () => {
  it('vira litros a partir de 1000', () => {
    expect(formatVolume(300)).toBe('300 ml');
    expect(formatVolume(999)).toBe('999 ml');
    expect(formatVolume(1000)).toBe('1,0 L');
    expect(formatVolume(2500)).toBe('2,5 L');
  });
});

describe('formatClock', () => {
  it('formata como relógio de 24h', () => {
    expect(formatClock(450)).toBe('07:30');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(1439)).toBe('23:59');
  });

  it('dá a volta em vez de estourar', () => {
    expect(formatClock(1500)).toBe('01:00');
    expect(formatClock(-30)).toBe('23:30');
  });
});
