import { dayKey, dayKeyOf, middayOf, previousDay } from '@/lib/date';

describe('dia lógico às 03:00', () => {
  it('01:30 ainda fecha o dia anterior', () => {
    expect(dayKey(new Date(2026, 6, 28, 1, 30))).toBe('2026-07-27');
  });

  it('02:59 é o último minuto do dia anterior', () => {
    expect(dayKey(new Date(2026, 6, 28, 2, 59, 59))).toBe('2026-07-27');
  });

  it('03:00 abre o dia novo', () => {
    expect(dayKey(new Date(2026, 6, 28, 3, 0))).toBe('2026-07-28');
  });

  it('o resto do dia é trivial', () => {
    expect(dayKey(new Date(2026, 6, 28, 12, 0))).toBe('2026-07-28');
    expect(dayKey(new Date(2026, 6, 28, 23, 59))).toBe('2026-07-28');
  });

  it('atravessa a virada do mês', () => {
    expect(dayKey(new Date(2026, 7, 1, 1, 0))).toBe('2026-07-31');
  });

  it('atravessa a virada do ano', () => {
    expect(dayKey(new Date(2027, 0, 1, 2, 0))).toBe('2026-12-31');
  });

  it('dayKeyOf concorda com dayKey', () => {
    const instante = new Date(2026, 6, 28, 1, 30);
    expect(dayKeyOf(instante.getTime())).toBe(dayKey(instante));
  });
});

describe('previousDay', () => {
  it('volta um dia', () => {
    expect(previousDay('2026-07-28')).toBe('2026-07-27');
  });

  it('volta para o mês anterior', () => {
    expect(previousDay('2026-07-01')).toBe('2026-06-30');
  });

  it('volta para o ano anterior', () => {
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
  });

  it('lida com ano bissexto', () => {
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
  });
});

describe('middayOf', () => {
  it('devolve meio-dia local da chave', () => {
    const at = middayOf('2026-07-28');
    const d = new Date(at);
    expect(d.getHours()).toBe(12);
    expect(dayKeyOf(at)).toBe('2026-07-28');
  });
});
