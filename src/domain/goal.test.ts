import {
  DEFAULT_GOAL_ML,
  GOAL_MAX_ML,
  GOAL_MIN_ML,
  GOAL_STEP_ML,
  clampGoal,
  computeGoal,
  goalWasClamped,
  levelFromXp,
  levelProgress,
  snapGoal,
  xpForLevel,
} from '@/domain/goal';

describe('computeGoal (§4.1)', () => {
  const base = { weightKg: 70, sex: 'na', activity: 'baixa', climate: 'temperado' } as const;

  it('usa peso * 35 no caso mais simples', () => {
    // 70*35 = 2450 -> 2500 no passo de 100
    expect(computeGoal(base)).toBe(2500);
  });

  it('soma 250 para homem', () => {
    expect(computeGoal({ ...base, sex: 'm' })).toBe(2700);
  });

  it('não soma nada para feminino nem para não informado', () => {
    expect(computeGoal({ ...base, sex: 'f' })).toBe(2500);
    expect(computeGoal({ ...base, sex: 'na' })).toBe(2500);
  });

  it('soma o bônus de atividade', () => {
    expect(computeGoal({ ...base, activity: 'media' })).toBe(2800);
    expect(computeGoal({ ...base, activity: 'alta' })).toBe(3200);
  });

  it('soma 500 em clima quente', () => {
    expect(computeGoal({ ...base, climate: 'quente' })).toBe(3000);
  });

  it('acumula todos os bônus', () => {
    // 2450 + 250 + 700 + 500 = 3900
    expect(computeGoal({ weightKg: 70, sex: 'm', activity: 'alta', climate: 'quente' })).toBe(3900);
  });

  it('sempre cai num múltiplo de 100 — o mesmo passo que a tela mostra', () => {
    // 63*35 = 2205 -> 2200
    expect(computeGoal({ ...base, weightKg: 63 })).toBe(2200);
    expect(snapGoal(2205)).toBe(2200);
    expect(snapGoal(2251)).toBe(2300);

    // Varre a faixa de peso inteira: nenhuma combinação escapa do passo, senão
    // volta o valor que a tela não consegue escrever.
    for (let peso = 30; peso <= 250; peso += 1) {
      for (const activity of ['baixa', 'media', 'alta'] as const) {
        const meta = computeGoal({ weightKg: peso, sex: 'm', activity, climate: 'quente' });
        expect(meta % GOAL_STEP_ML).toBe(0);
      }
    }
  });

  it('respeita o piso para pessoa muito leve', () => {
    // 30*35 = 1050, abaixo do mínimo
    expect(computeGoal({ ...base, weightKg: 30 })).toBe(GOAL_MIN_ML);
  });

  it('respeita o teto para os extremos', () => {
    expect(
      computeGoal({ weightKg: 250, sex: 'm', activity: 'alta', climate: 'quente' }),
    ).toBe(GOAL_MAX_ML);
  });
});

describe('clampGoal', () => {
  it('limita nos dois extremos', () => {
    expect(clampGoal(100)).toBe(GOAL_MIN_ML);
    expect(clampGoal(99999)).toBe(GOAL_MAX_ML);
    expect(clampGoal(2000)).toBe(2000);
  });

  it('cai no padrão para valor inválido', () => {
    expect(clampGoal(Number.NaN)).toBe(DEFAULT_GOAL_ML);
    expect(clampGoal(Number.POSITIVE_INFINITY)).toBe(DEFAULT_GOAL_ML);
  });

  /**
   * O 3050 é o caso real de 05/08/2026: a tela escrevia `3,0 L` e a garrafa exigia
   * 3050, então quem bebia 3000 via os dois números iguais e nada de verde.
   */
  it('encaixa no passo de 100 — nenhum valor que a tela não escreve chega ao disco', () => {
    expect(clampGoal(2949)).toBe(2900);
    expect(clampGoal(2951)).toBe(3000);
    // Empate vai para cima, que é o `Math.round` do JS. A direção é indiferente:
    // valor fora do passo só aparece vindo de estado antigo, e o ± normaliza no
    // primeiro toque — de 3050, "diminuir" pede 2950 e grava 3000.
    expect(clampGoal(2950)).toBe(3000);
    expect(clampGoal(3050)).toBe(3100);
  });

  it('avisa quando teve de limitar, e não quando só encaixou no passo', () => {
    expect(goalWasClamped(9000)).toBe(true);
    expect(goalWasClamped(2000)).toBe(false);
    expect(goalWasClamped(2050)).toBe(false);
  });
});

describe('nível de XP (§7.2)', () => {
  it('começa no nível 1', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });

  it('sobe pela raiz de xp/100', () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
    expect(levelFromXp(900)).toBe(4);
  });

  it('xpForLevel é o inverso de levelFromXp', () => {
    for (const nivel of [1, 2, 3, 5, 10]) {
      expect(levelFromXp(xpForLevel(nivel))).toBe(nivel);
    }
  });

  it('progresso vai de 0 a 1 dentro do nível', () => {
    expect(levelProgress(100)).toBe(0);
    expect(levelProgress(250)).toBeCloseTo(0.5, 5);
    expect(levelProgress(399)).toBeGreaterThan(0.99);
  });

  it('não quebra com XP negativo', () => {
    expect(levelFromXp(-50)).toBe(1);
  });
});
