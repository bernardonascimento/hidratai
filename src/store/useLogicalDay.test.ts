import { LOGICAL_DAY_START_HOUR, msUntilNextLogicalDay } from '@/lib/date';
import { useLogicalDay } from '@/store/useLogicalDay';

describe('msUntilNextLogicalDay', () => {
  it('aponta para as 03:00 de hoje quando ainda é madrugada', () => {
    // 01:30 -> falta 1h30 para as 03:00
    const madrugada = new Date(2026, 6, 30, 1, 30, 0, 0);
    expect(msUntilNextLogicalDay(madrugada)).toBe(90 * 60 * 1000);
  });

  it('aponta para amanhã quando já passou das 03:00', () => {
    // 09:00 -> faltam 18h para as 03:00 do dia seguinte
    const manha = new Date(2026, 6, 30, 9, 0, 0, 0);
    expect(msUntilNextLogicalDay(manha)).toBe(18 * 60 * 60 * 1000);
  });

  it('nunca devolve zero nem negativo, nem em cima da virada', () => {
    const emCima = new Date(2026, 6, 30, LOGICAL_DAY_START_HOUR, 0, 0, 0);
    // Exatamente 03:00 já pertence ao novo dia: a próxima virada é a de amanhã.
    expect(msUntilNextLogicalDay(emCima)).toBe(24 * 60 * 60 * 1000);

    for (const h of [0, 3, 12, 23]) {
      expect(msUntilNextLogicalDay(new Date(2026, 6, 30, h, 0, 0, 0))).toBeGreaterThan(0);
    }
  });

  it('atravessa a virada do mês sem estourar', () => {
    const fimDoMes = new Date(2026, 6, 31, 23, 0, 0, 0);
    const falta = msUntilNextLogicalDay(fimDoMes);
    expect(falta).toBe(4 * 60 * 60 * 1000); // 23:00 -> 03:00
  });
});

describe('useLogicalDay', () => {
  it('não sinaliza mudança quando o dia é o mesmo', () => {
    // Duas chamadas seguidas: a segunda não pode dizer que o dia virou.
    useLogicalDay.getState().refresh();
    expect(useLogicalDay.getState().refresh()).toBe(false);
  });

  it('sinaliza mudança e atualiza quando o dia está velho', () => {
    useLogicalDay.setState({ today: '2020-01-01' });

    expect(useLogicalDay.getState().refresh()).toBe(true);
    expect(useLogicalDay.getState().today).not.toBe('2020-01-01');
    // E não repete o sinal na chamada seguinte.
    expect(useLogicalDay.getState().refresh()).toBe(false);
  });
});
