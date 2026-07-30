import { levelFromXp } from '@/domain/goal';
import { STAGES, nextStage, stageForLevel, stageForXp } from '@/domain/levels';
import { TIPS_COUNT, tipForDate } from '@/domain/tips';

describe('estágios de nível', () => {
  it('começa em Gota', () => {
    expect(stageForLevel(1).name).toBe('Gota');
    expect(stageForLevel(2).name).toBe('Gota');
  });

  it('avança nos limites certos', () => {
    expect(stageForLevel(3).name).toBe('Poça');
    expect(stageForLevel(5).name).toBe('Riacho');
    expect(stageForLevel(7).name).toBe('Rio');
    expect(stageForLevel(10).name).toBe('Cachoeira');
    expect(stageForLevel(14).name).toBe('Oceano');
  });

  it('não passa do último estágio', () => {
    expect(stageForLevel(99).name).toBe('Oceano');
    expect(nextStage(99)).toBeNull();
  });

  it('aponta o próximo estágio', () => {
    expect(nextStage(1)?.name).toBe('Poça');
    expect(nextStage(9)?.name).toBe('Cachoeira');
  });

  it('deriva o estágio direto do XP', () => {
    // 100 XP = nível 2 = Gota; 900 XP = nível 4 = Poça
    expect(stageForXp(100).name).toBe(stageForLevel(levelFromXp(100)).name);
    expect(stageForXp(900).name).toBe('Poça');
  });

  it('os estágios estão em ordem crescente e sem buraco', () => {
    for (let i = 1; i < STAGES.length; i += 1) {
      expect(STAGES[i].from).toBeGreaterThan(STAGES[i - 1].from);
    }
    // Todo nível de 1 a 30 tem estágio.
    for (let nivel = 1; nivel <= 30; nivel += 1) {
      expect(stageForLevel(nivel)).toBeDefined();
    }
  });
});

describe('dica do dia', () => {
  it('é determinística pela data', () => {
    expect(tipForDate('2026-07-28')).toBe(tipForDate('2026-07-28'));
  });

  it('varia ao longo dos dias', () => {
    const dicas = new Set(
      ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31'].map(tipForDate),
    );
    expect(dicas.size).toBeGreaterThan(1);
  });

  it('sempre devolve uma dica do pool', () => {
    expect(TIPS_COUNT).toBeGreaterThan(0);
    expect(tipForDate('2026-01-01').length).toBeGreaterThan(10);
  });

  it('nenhuma dica promete resultado de saúde', () => {
    // Varre um ano de datas e confere o vocabulário proibido.
    const proibidas = ['cura', 'emagrec', 'desintox', 'toxina', 'metabolismo', 'garantido'];
    for (let d = 1; d <= 28; d += 1) {
      const dica = tipForDate(`2026-02-${String(d).padStart(2, '0')}`).toLowerCase();
      for (const palavra of proibidas) {
        expect(dica).not.toContain(palavra);
      }
    }
  });
});
