import {
  DEFAULT_INTERVAL_MIN,
  REMINDER_PHRASES_COUNT,
  hourMinute,
  momentoDe,
  perennialSlots,
  phraseFor,
  reminderSlots,
} from '@/domain/reminders';

/** Mesmo passo de relógio usado pelo domínio. */
const PASSO_RELOGIO = 5;

const ACORDA_7H = 7 * 60;
const DORME_23H = 23 * 60;

describe('reminderSlots (§6.1)', () => {
  it('respeita a folga de 30 min ao acordar e 60 min antes de dormir', () => {
    const slots = reminderSlots(ACORDA_7H, DORME_23H, DEFAULT_INTERVAL_MIN);

    expect(slots[0]).toBe(ACORDA_7H + 30); // 07:30
    expect(slots.at(-1)).toBeLessThan(DORME_23H - 60); // antes das 22:00
  });

  it('mantém a contagem entre 4 e 15', () => {
    // Janela útil de 14h30 (07:30 às 22:00) = 870 min
    // 870 / 90 = 9 intervalos -> 10 avisos
    expect(reminderSlots(ACORDA_7H, DORME_23H, 90)).toHaveLength(10);
    // Intervalo enorme daria 2; o mínimo de 4 entra e distribui por igual
    expect(reminderSlots(ACORDA_7H, DORME_23H, 600)).toHaveLength(4);
    // Intervalo minúsculo bate no teto de 15
    expect(reminderSlots(ACORDA_7H, DORME_23H, 10)).toHaveLength(15);
  });

  it('honra o intervalo escolhido em vez de diluí-lo na janela', () => {
    // O defeito que isto cobre: com o teto antigo, "60 min" virava 72,5 min
    const slots = reminderSlots(ACORDA_7H, DORME_23H, 60);
    const passos = slots.slice(1).map((v, i) => v - slots[i]);

    expect(slots).toHaveLength(15);
    for (const passo of passos) expect(passo).toBe(60);
    expect(slots[0]).toBe(7 * 60 + 30); // 07:30
    expect(slots.at(-1)).toBe(21 * 60 + 30); // 21:30, dentro da janela
  });

  it('nunca agenda depois do fim da janela, nem no caso apertado', () => {
    const casos: [number, number, number][] = [
      [ACORDA_7H, DORME_23H, 60],
      [ACORDA_7H, DORME_23H, 10],
      [ACORDA_7H, DORME_23H, 600],
      [6 * 60, 22 * 60, 60],
      [9 * 60, 21 * 60, 180],
    ];

    for (const [acorda, dorme, intervalo] of casos) {
      const slots = reminderSlots(acorda, dorme, intervalo);
      for (const slot of slots) {
        expect(slot).toBeGreaterThanOrEqual(acorda + 30);
        expect(slot).toBeLessThanOrEqual(dorme - 60);
      }
    }
  });

  it('não avisa quando a janela não cabe um intervalo', () => {
    // Acorda 7h, dorme 8h30: a janela útil é negativa depois das folgas
    expect(reminderSlots(7 * 60, 8 * 60 + 30)).toEqual([]);
  });

  it('devolve vazio para rotina invertida em vez de horário absurdo', () => {
    // Quem "dorme" antes de acordar (dado inconsistente) não recebe nada
    expect(reminderSlots(22 * 60, 6 * 60)).toEqual([]);
  });

  it('espaça de forma uniforme e crescente', () => {
    const slots = reminderSlots(ACORDA_7H, DORME_23H);
    const passos = slots.slice(1).map((v, i) => v - slots[i]);

    for (const passo of passos) expect(passo).toBeGreaterThan(0);
    // Tolerância de 5 min: é o preço do arredondamento para o relógio
    expect(Math.max(...passos) - Math.min(...passos)).toBeLessThanOrEqual(PASSO_RELOGIO);
  });

  it('cai em horários redondos, não em 20:33', () => {
    for (const slot of reminderSlots(ACORDA_7H, DORME_23H)) {
      expect(slot % PASSO_RELOGIO).toBe(0);
    }
  });
});

describe('perennialSlots (camada B, §6.2)', () => {
  it('cobre o dia pelas pontas, não só o começo', () => {
    const slots = [8, 10, 12, 14, 16, 18, 20].map((h) => h * 60);
    const perenes = perennialSlots(slots, 4);

    expect(perenes[0]).toBe(8 * 60);
    expect(perenes.at(-1)).toBe(20 * 60);
    expect(perenes).toHaveLength(4);
  });

  it('devolve tudo quando há menos slots que o pedido', () => {
    const slots = [9 * 60, 15 * 60];
    expect(perennialSlots(slots, 4)).toEqual(slots);
  });

  it('não repete horário quando os índices colidem', () => {
    const slots = [9 * 60, 12 * 60, 15 * 60];
    const perenes = perennialSlots(slots, 4);
    expect(new Set(perenes).size).toBe(perenes.length);
  });

  it('não quebra com lista vazia', () => {
    expect(perennialSlots([], 4)).toEqual([]);
  });
});

describe('hourMinute', () => {
  it('converte minutos do dia em hora e minuto', () => {
    expect(hourMinute(0)).toEqual({ hour: 0, minute: 0 });
    expect(hourMinute(7 * 60 + 30)).toEqual({ hour: 7, minute: 30 });
    expect(hourMinute(23 * 60 + 59)).toEqual({ hour: 23, minute: 59 });
  });

  it('dá a volta em vez de estourar 24h', () => {
    // 25h vira 1h — o trigger diário rejeita hora fora de 0..23
    expect(hourMinute(25 * 60)).toEqual({ hour: 1, minute: 0 });
    expect(hourMinute(-30)).toEqual({ hour: 23, minute: 30 });
  });
});

describe('momentoDe', () => {
  it('divide o dia em manhã, tarde e noite', () => {
    expect(momentoDe(7 * 60)).toBe('manha');
    expect(momentoDe(11 * 60 + 59)).toBe('manha');
    expect(momentoDe(12 * 60)).toBe('tarde');
    expect(momentoDe(17 * 60 + 59)).toBe('tarde');
    expect(momentoDe(18 * 60)).toBe('noite');
    expect(momentoDe(23 * 60)).toBe('noite');
  });
});

describe('phraseFor (§6.3)', () => {
  const MANHA = { momento: 'manha' } as const;
  const TARDE = { momento: 'tarde' } as const;
  const NOITE = { momento: 'noite' } as const;

  /** Todas as combinações que a produção pode gerar. */
  const CONTEXTOS = [
    MANHA,
    TARDE,
    NOITE,
    { momento: 'manha', fracao: 0 },
    { momento: 'tarde', fracao: 0 },
    { momento: 'noite', fracao: 0.2 },
    { momento: 'tarde', fracao: 0.5 },
    { momento: 'noite', fracao: 0.8 },
    { momento: 'manha', fracao: 1 },
  ] as const;

  it('é estável para o mesmo dia, índice e contexto', () => {
    expect(phraseFor('2026-07-29', 3, TARDE)).toBe(phraseFor('2026-07-29', 3, TARDE));
  });

  it('não repete dentro do mesmo grupo, até esgotá-lo', () => {
    // Oito é o tamanho de cada grupo, e o passo 7 é primo com 8 — se algum grupo
    // mudar de tamanho para um número que compartilhe fator com 7, isto quebra.
    for (const ctx of CONTEXTOS) {
      const oito = Array.from({ length: 8 }, (_, i) => phraseFor('2026-07-29', i, ctx));
      expect(new Set(oito).size).toBe(8);
    }
  });

  it('muda de um dia para o outro', () => {
    const hoje = Array.from({ length: 6 }, (_, i) => phraseFor('2026-07-29', i, TARDE));
    const amanha = Array.from({ length: 6 }, (_, i) => phraseFor('2026-07-30', i, TARDE));
    expect(hoje).not.toEqual(amanha);
  });

  it('reage ao momento do dia', () => {
    const manha = new Set(Array.from({ length: 8 }, (_, i) => phraseFor('2026-07-29', i, MANHA)));
    const noite = new Set(Array.from({ length: 8 }, (_, i) => phraseFor('2026-07-29', i, NOITE)));
    // Grupos disjuntos: nenhuma frase de manhã pode sair à noite.
    for (const f of manha) expect(noite.has(f)).toBe(false);
  });

  it('estar em zero pela manhã não vira convite de retomada', () => {
    // Acordar sem ter bebido é o normal, não um dia perdido — só da tarde em diante o
    // progresso baixo muda o tom.
    const semDado = Array.from({ length: 8 }, (_, i) => phraseFor('2026-07-29', i, MANHA));
    const zerado = Array.from({ length: 8 }, (_, i) =>
      phraseFor('2026-07-29', i, { momento: 'manha', fracao: 0 }),
    );
    expect(zerado).toEqual(semDado);
  });

  it('sem fracao, o texto só depende do horário', () => {
    // É o contrato da camada perene: `DAILY` repete para sempre, então nada que ela
    // diga pode depender do progresso de um dia específico.
    const comMeta = Array.from({ length: 8 }, (_, i) =>
      phraseFor('2026-07-29', i, { momento: 'tarde', fracao: 1 }),
    );
    const semDado = Array.from({ length: 8 }, (_, i) => phraseFor('2026-07-29', i, TARDE));
    expect(comMeta).not.toEqual(semDado);
  });

  it('nunca usa emoji, culpa, nem volume exato', () => {
    const todas = new Set<string>();
    for (const ctx of CONTEXTOS) {
      for (let i = 0; i < REMINDER_PHRASES_COUNT; i += 1) {
        todas.add(phraseFor('2026-07-29', i, ctx));
      }
    }

    for (const frase of todas) {
      expect(frase).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      expect(frase.toLowerCase()).not.toMatch(/falh|esque|devia|deveria|atras/);
      expect(frase.split(/\s+/).length).toBeLessThanOrEqual(8);
      // Volume ou porcentagem cravados envelheceriam: o texto é escrito no
      // agendamento e o progresso pode mudar antes de disparar.
      expect(frase).not.toMatch(/\d+\s*(ml|l\b|%)/i);
    }
  });
});
