/**
 * Testes do agendamento — a parte que o §6 chama de "a que costuma quebrar".
 *
 * O que importa aqui não é o texto da notificação (isso é `reminders.test.ts`), e
 * sim as invariantes que fazem o lembrete **não secar**: nenhum horário com dois
 * donos, total abaixo do limite de 64 do iOS, e cancelamento antes de reagendar.
 */

import { DEFAULT_INTERVAL_MIN } from '@/domain/reminders';
import { dayKey, dayKeyOf, weekdayOf } from '@/lib/date';
import { syncReminders } from '@/lib/notifications';
import { useGamification } from '@/store/useGamification';
import { useProfile } from '@/store/useProfile';
import { useWater } from '@/store/useWater';

// Prefixo `mock` é exigência do babel-plugin-jest-hoist: a factory do `jest.mock`
// é elevada para antes das declarações, e só nomes assim podem ser referenciados.
const mockAgendadas: { content: Record<string, unknown>; trigger: Record<string, unknown> }[] = [];
let mockCanceladas = 0;
let mockPermissao = { granted: true, canAskAgain: true };

// O `jest.mock` fica **depois** dos imports de propósito: o plugin do Jest o eleva
// para antes deles na compilação, e escrevê-lo aqui mantém a ordem de import que o
// lint exige sem quebrar o mock.
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn(async () => ({})),
  getPermissionsAsync: jest.fn(async () => mockPermissao),
  requestPermissionsAsync: jest.fn(async () => mockPermissao),
  setBadgeCountAsync: jest.fn(async () => true),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockCanceladas += 1;
    mockAgendadas.length = 0;
  }),
  scheduleNotificationAsync: jest.fn(async (req: (typeof mockAgendadas)[number]) => {
    mockAgendadas.push(req);
    return 'id';
  }),
}));

/** Limite do iOS: acima disto o sistema descarta o excedente silenciosamente. */
const LIMITE_IOS = 64;

function ligarLembretes(intervalo = DEFAULT_INTERVAL_MIN) {
  useProfile.setState({
    profile: { ...useProfile.getState().profile, wakeMinutes: 7 * 60, sleepMinutes: 23 * 60 },
    reminders: { enabled: true, intervalMinutes: intervalo },
  });
}

beforeEach(() => {
  mockAgendadas.length = 0;
  mockCanceladas = 0;
  mockPermissao = { granted: true, canAskAgain: true };
  useWater.setState({ days: {}, goalMl: 2500 });
  useGamification.setState({ restDay: null });
  ligarLembretes();
});

describe('syncReminders — invariantes das duas camadas (§6.2)', () => {
  it('cancela o que existia antes de reagendar', async () => {
    await syncReminders();
    expect(mockCanceladas).toBe(1);
  });

  it('nenhum horário é agendado pelas duas camadas', async () => {
    await syncReminders();

    const diarias = mockAgendadas.filter((a) => a.trigger.type === 'daily');
    const horariosDiarios = new Set(diarias.map((a) => `${a.trigger.hour}:${a.trigger.minute}`));

    const datas = mockAgendadas.filter((a) => a.trigger.type === 'date');
    for (const a of datas) {
      const d = a.trigger.date as Date;
      expect(horariosDiarios.has(`${d.getHours()}:${d.getMinutes()}`)).toBe(false);
    }
  });

  it('mantém uma rede perene que não expira', async () => {
    await syncReminders();
    const diarias = mockAgendadas.filter((a) => a.trigger.type === 'daily');
    // Sem estas, quem não abre o app por uma semana para de receber.
    expect(diarias.length).toBeGreaterThanOrEqual(3);
  });

  it('fica folgado abaixo do limite de 64 do iOS, até no pior caso', async () => {
    // Intervalo mínimo = 12 slots, a janela mais cheia possível
    ligarLembretes(10);
    await syncReminders();
    expect(mockAgendadas.length).toBeLessThan(LIMITE_IOS);
  });

  it('é idempotente: rodar duas vezes não acumula', async () => {
    await syncReminders();
    const primeira = mockAgendadas.length;
    await syncReminders();
    expect(mockAgendadas.length).toBe(primeira);
  });

  it('todas levam a categoria da ação rápida', async () => {
    await syncReminders();
    for (const a of mockAgendadas) expect(a.content.categoryIdentifier).toBe('lembrete-agua');
  });

  it('numera o badge pela ordem de disparo, começando em 1', async () => {
    await syncReminders();

    const datas = mockAgendadas.filter((a) => a.trigger.type === 'date');
    const badges = datas.map((a) => a.content.badge);

    // 1, 2, 3... e não a posição do slot na grade do dia: ligar o lembrete ao
    // meio-dia mostrava "5" no primeiro aviso recebido.
    expect(badges).toEqual(datas.map((_, i) => i + 1));
  });

  it('não deixa o perene mexer no badge', async () => {
    await syncReminders();

    // `DAILY` repete para sempre: qualquer número estaria certo num dia e errado
    // nos outros, então ele não toca no badge.
    for (const a of mockAgendadas.filter((x) => x.trigger.type === 'daily')) {
      expect(a.content.badge).toBeUndefined();
    }
  });

  it('só agenda datas no futuro', async () => {
    await syncReminders();
    const agora = Date.now();
    for (const a of mockAgendadas.filter((x) => x.trigger.type === 'date')) {
      expect((a.trigger.date as Date).getTime()).toBeGreaterThan(agora);
    }
  });
});

describe('syncReminders — quando não deve agendar', () => {
  it('não agenda nada com o lembrete desligado, e ainda assim cancela', async () => {
    useProfile.setState({ reminders: { enabled: false, intervalMinutes: 90 } });

    const r = await syncReminders();

    expect(r).toEqual({ scheduled: 0, reason: 'desligado' });
    expect(mockAgendadas).toHaveLength(0);
    // Desligar precisa apagar o que já estava agendado, senão continua notificando.
    expect(mockCanceladas).toBe(1);
  });

  it('não agenda sem permissão do sistema', async () => {
    mockPermissao = { granted: false, canAskAgain: true };
    const r = await syncReminders();
    expect(r.reason).toBe('sem-permissao');
    expect(mockAgendadas).toHaveLength(0);
  });

  it('não agenda quando a janela do dia não cabe um intervalo', async () => {
    useProfile.setState({
      profile: { ...useProfile.getState().profile, wakeMinutes: 7 * 60, sleepMinutes: 8 * 60 },
    });
    const r = await syncReminders();
    expect(r.reason).toBe('janela-curta');
  });
});

describe('syncReminders — meta batida', () => {
  it('cala os avisos precisos de hoje, mas preserva a rede perene', async () => {
    // `dayKey()`, não a data civil montada à mão: o dia lógico começa às 03:00, então
    // entre a meia-noite e as 3h os dois divergem. A primeira versão deste teste
    // passava de dia e falhava de madrugada — exatamente a armadilha do §12.
    const chave = dayKey();

    useWater.setState({
      goalMl: 2500,
      days: {
        [chave]: {
          date: chave,
          goalMl: 2500,
          entries: [],
          totalHydrationMl: 3000,
          metGoal: true,
        },
      },
    });

    await syncReminders();

    // Pertencer ao "hoje" é o mesmo `dayKeyOf` que o app usa, não uma comparação de
    // meia-noite civil.
    const datasDeHoje = mockAgendadas.filter(
      (a) => a.trigger.type === 'date' && dayKeyOf((a.trigger.date as Date).getTime()) === chave,
    );
    expect(datasDeHoje).toHaveLength(0);

    // A rede perene continua: `DAILY` não sabe de meta, e é ela que sobrevive.
    expect(mockAgendadas.filter((a) => a.trigger.type === 'daily').length).toBeGreaterThan(0);
    // E amanhã volta ao normal.
    expect(mockAgendadas.filter((a) => a.trigger.type === 'date').length).toBeGreaterThan(0);
  });
});

describe('syncReminders — dia livre', () => {
  /** Datas da camada A que caem no dia da semana dado. */
  function datasNoDiaDaSemana(dia: number) {
    return mockAgendadas.filter(
      (a) =>
        a.trigger.type === 'date' &&
        weekdayOf(dayKeyOf((a.trigger.date as Date).getTime())) === dia,
    );
  }

  it('não agenda a camada precisa no dia livre', async () => {
    // Escolhe como livre um dia da semana que a janela de 3 dias realmente cobre,
    // senão o teste passaria por não haver nada para pular.
    useGamification.setState({ restDay: null });
    await syncReminders();
    const cobertos = new Set(
      mockAgendadas
        .filter((a) => a.trigger.type === 'date')
        .map((a) => weekdayOf(dayKeyOf((a.trigger.date as Date).getTime()))),
    );
    const livre = [...cobertos][0];
    expect(livre).toBeDefined();

    useGamification.setState({ restDay: livre });
    await syncReminders();

    expect(datasNoDiaDaSemana(livre)).toHaveLength(0);
  });

  it('mantém os perenes no dia livre — a folga é da ofensiva, não do corpo', async () => {
    useGamification.setState({ restDay: new Date().getDay() });
    await syncReminders();

    // Os 4 `DAILY` continuam de pé: no dia livre a pessoa recebe o mínimo, não zero.
    expect(mockAgendadas.filter((a) => a.trigger.type === 'daily').length).toBeGreaterThan(0);
  });

  it('sem dia livre, nenhum dia da semana é pulado', async () => {
    useGamification.setState({ restDay: null });
    await syncReminders();

    const porDia = new Set(
      mockAgendadas
        .filter((a) => a.trigger.type === 'date')
        .map((a) => dayKeyOf((a.trigger.date as Date).getTime())),
    );
    // Hoje pode cair fora por já ter passado do último horário, mas os outros dois
    // dias da janela precisam estar lá.
    expect(porDia.size).toBeGreaterThanOrEqual(2);
  });
});
