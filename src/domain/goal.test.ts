import {
  DEFAULT_GOAL_ML,
  GOAL_MAX_ML,
  GOAL_MIN_ML,
  clampGoal,
  computeGoal,
  goalWasClamped,
  levelFromXp,
  levelProgress,
  roundTo50,
  xpForLevel,
} from '@/domain/goal';

describe('computeGoal (§4.1)', () => {
  const base = { weightKg: 70, sex: 'na', activity: 'baixa', climate: 'temperado' } as const;

  it('usa peso * 35 no caso mais simples', () => {
    // 70*35 = 2450
    expect(computeGoal(base)).toBe(2450);
  });

  it('soma 250 para homem', () => {
    expect(computeGoal({ ...base, sex: 'm' })).toBe(2700);
  });

  it('não soma nada para feminino nem para não informado', () => {
    expect(computeGoal({ ...base, sex: 'f' })).toBe(2450);
    expect(computeGoal({ ...base, sex: 'na' })).toBe(2450);
  });

  it('soma o bônus de atividade', () => {
    expect(computeGoal({ ...base, activity: 'media' })).toBe(2800);
    expect(computeGoal({ ...base, activity: 'alta' })).toBe(3150);
  });

  it('soma 500 em clima quente', () => {
    expect(computeGoal({ ...base, climate: 'quente' })).toBe(2950);
  });

  it('acumula todos os bônus', () => {
    // 2450 + 250 + 700 + 500 = 3900
    expect(computeGoal({ weightKg: 70, sex: 'm', activity: 'alta', climate: 'quente' })).toBe(3900);
  });

  it('arredonda para múltiplo de 50', () => {
    // 63*35 = 2205 -> 2200
    expect(computeGoal({ ...base, weightKg: 63 })).toBe(2200);
    expect(roundTo50(2205)).toBe(2200);
    expect(roundTo50(2226)).toBe(2250);
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

  it('avisa quando teve de limitar — a UI explica ao usuário', () => {
    expect(goalWasClamped(9000)).toBe(true);
    expect(goalWasClamped(2000)).toBe(false);
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
