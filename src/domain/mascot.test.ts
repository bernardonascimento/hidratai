import { type Mood, mascotMood, mascotPhrase } from '@/domain/mascot';

const ROTINA = { wakeMinutes: 7 * 60, sleepMinutes: 23 * 60 };
/** 10h: 19% da janela — dia ainda no começo. */
const MANHA = 10 * 60;
/** 20h: 81% da janela — dia avançado. */
const NOITE = 20 * 60;

const mood = (progress: number, minutesOfDay: number) =>
  mascotMood({ progress, minutesOfDay, ...ROTINA });

describe('mascotMood (§8.2)', () => {
  it('fica neutra no começo do dia com pouca água', () => {
    expect(mood(0, MANHA)).toBe('neutra');
    expect(mood(0.24, MANHA)).toBe('neutra');
  });

  it('fica animada a partir de um quarto da meta', () => {
    expect(mood(0.25, MANHA)).toBe('animada');
    expect(mood(0.99, MANHA)).toBe('animada');
  });

  it('fica radiante ao bater a meta, e continua acima dela', () => {
    expect(mood(1, MANHA)).toBe('radiante');
    expect(mood(1.5, NOITE)).toBe('radiante');
  });

  it('fica atenta com o dia avançado e pouca água', () => {
    expect(mood(0, NOITE)).toBe('atenta');
    expect(mood(0.39, NOITE)).toBe('atenta');
  });

  it('atenta vence animada: 30% às 20h pede empurrão, não elogio', () => {
    // A mesma fração de manhã é animada; à noite, atenta.
    expect(mood(0.3, MANHA)).toBe('animada');
    expect(mood(0.3, NOITE)).toBe('atenta');
  });

  it('não fica atenta se já passou de 40%, mesmo tarde', () => {
    expect(mood(0.5, NOITE)).toBe('animada');
  });

  it('meta batida vence o dia avançado', () => {
    expect(mood(1, NOITE)).toBe('radiante');
  });

  it('não quebra com rotina inconsistente', () => {
    // Janela nula ou negativa não pode virar divisão por zero nem NaN
    const m = mascotMood({ progress: 0, minutesOfDay: 600, wakeMinutes: 600, sleepMinutes: 600 });
    expect(['neutra', 'animada', 'radiante', 'atenta']).toContain(m);
  });
});

describe('mascotPhrase', () => {
  it('convida quem ainda não registrou nada', () => {
    expect(mascotPhrase('neutra', false)).toBe('Vamos começar o dia');
    // Vale para qualquer estado: sem registro, a fala é de partida
    expect(mascotPhrase('atenta', false)).toBe('Vamos começar o dia');
  });

  it('dá uma fala própria a cada estado', () => {
    const falas = (['neutra', 'animada', 'radiante', 'atenta'] as Mood[]).map((m) =>
      mascotPhrase(m, true),
    );
    expect(new Set(falas).size).toBe(4);
  });

  it('nunca cobra nem culpa, nem no estado atenta', () => {
    const todas = (['neutra', 'animada', 'radiante', 'atenta'] as Mood[]).flatMap((m) => [
      mascotPhrase(m, true),
      mascotPhrase(m, false),
    ]);

    for (const fala of todas) {
      expect(fala.toLowerCase()).not.toMatch(/falh|fracass|devia|deveria|perdeu|atrasad|pouco/);
      expect(fala).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });
});
