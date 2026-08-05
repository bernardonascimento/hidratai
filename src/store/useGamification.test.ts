import type { DayLog, Entry } from '@/domain/types';
import {
  XP_BONUS_META,
  XP_MAX_POR_DIA,
  XP_POR_REGISTRO,
  useGamification,
  xpOfDay,
} from '@/store/useGamification';

const HOJE = '2026-08-05';

/** `n` registros de 500 ml, o suficiente para `xpOfDay` contar. */
function registros(n: number): Entry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${HOJE}-${i}`,
    at: 0,
    drinkId: 'agua',
    volumeMl: 500,
    hydrationMl: 500,
  }));
}

function dia(date: string, quantos: number, metGoal: boolean, goalMl = 3000): DayLog {
  return {
    date,
    goalMl,
    entries: registros(quantos),
    totalHydrationMl: quantos * 500,
    metGoal,
  };
}

/** Um dia fechado com a meta batida — o que `metGoalNow` reflete no momento do toque. */
function diaBatido(date: string, quantos = 6): Record<string, DayLog> {
  return { [date]: dia(date, quantos, true) };
}

describe('useGamification — gotas do Cantinho', () => {
  beforeEach(() => {
    useGamification.getState().reset();
  });

  it('paga uma gota no dia em que a meta é batida', () => {
    useGamification
      .getState()
      .onEntryAdded({ date: HOJE, volumeMl: 500, metGoalNow: true, days: diaBatido(HOJE) });

    expect(useGamification.getState().drops).toBe(1);
  });

  it('não paga gota em registro que não fecha a meta', () => {
    useGamification.getState().onEntryAdded({ date: HOJE, volumeMl: 500, metGoalNow: false, days: {} });

    expect(useGamification.getState().drops).toBe(0);
  });

  /**
   * O exploit relatado em 05/08/2026: desfazer o último copo depois de bater a meta e
   * registrar de novo pagava outra gota a cada volta, porque `metGoalNow` volta a ser
   * verdadeiro. Duas dezenas de toques desbloqueavam o Cantinho inteiro — 633 gotas, que
   * deveriam ser uns 2,4 anos de dias cumpridos.
   */
  it('não paga de novo quando o mesmo dia é desfeito e refeito', () => {
    const jogo = () => useGamification.getState();

    jogo().onEntryAdded({ date: HOJE, volumeMl: 500, metGoalNow: true, days: diaBatido(HOJE) });
    expect(jogo().drops).toBe(1);

    for (let volta = 0; volta < 5; volta += 1) {
      jogo().onEntryRemoved({
        date: HOJE,
        volumeMl: 500,
        lostGoal: true,
        dayBefore: dia(HOJE, 6, true),
        dayAfter: dia(HOJE, 5, false),
      });
      jogo().onEntryAdded({ date: HOJE, volumeMl: 500, metGoalNow: true, days: diaBatido(HOJE) });
    }

    expect(jogo().drops).toBe(1);
  });

  /**
   * A trava não pode ser "devolver a gota ao desfazer": gota é moeda gasta, então
   * gastá-la antes de desfazer zeraria o saldo e o registro seguinte pagaria outra.
   */
  it('não paga de novo nem quando a gota já foi gasta no Cantinho', () => {
    const jogo = () => useGamification.getState();

    jogo().onEntryAdded({ date: HOJE, volumeMl: 500, metGoalNow: true, days: diaBatido(HOJE) });
    useGamification.setState({ drops: 2 });
    expect(jogo().unlockElement('grama')).toBe(true); // custa 2
    expect(jogo().drops).toBe(0);

    jogo().onEntryRemoved({
      date: HOJE,
      volumeMl: 500,
      lostGoal: true,
      dayBefore: dia(HOJE, 6, true),
      dayAfter: dia(HOJE, 5, false),
    });
    jogo().onEntryAdded({ date: HOJE, volumeMl: 500, metGoalNow: true, days: diaBatido(HOJE) });

    expect(jogo().drops).toBe(0);
  });

  it('paga de novo quando é outro dia', () => {
    const jogo = () => useGamification.getState();

    jogo().onEntryAdded({ date: HOJE, volumeMl: 500, metGoalNow: true, days: diaBatido(HOJE) });
    jogo().onEntryAdded({
      date: '2026-08-06',
      volumeMl: 500,
      metGoalNow: true,
      days: diaBatido('2026-08-06'),
    });

    expect(jogo().drops).toBe(2);
  });

  it('"apagar tudo" zera a memória do dia pago junto com o saldo', () => {
    const jogo = () => useGamification.getState();

    jogo().onEntryAdded({ date: HOJE, volumeMl: 500, metGoalNow: true, days: diaBatido(HOJE) });
    jogo().reset();

    expect(jogo().drops).toBe(0);
    expect(jogo().lastDropDate).toBeNull();

    // E o mesmo dia volta a poder pagar: quem apagou tudo começa de fato do zero.
    jogo().onEntryAdded({ date: HOJE, volumeMl: 500, metGoalNow: true, days: diaBatido(HOJE) });
    expect(jogo().drops).toBe(1);
  });
});

describe('xpOfDay — o XP como função do dia', () => {
  it('conta 10 por registro', () => {
    expect(xpOfDay(dia(HOJE, 0, false))).toBe(0);
    expect(xpOfDay(dia(HOJE, 1, false))).toBe(XP_POR_REGISTRO);
    expect(xpOfDay(dia(HOJE, 3, false))).toBe(3 * XP_POR_REGISTRO);
  });

  it('soma o bônus do dia batido', () => {
    expect(xpOfDay(dia(HOJE, 3, true))).toBe(3 * XP_POR_REGISTRO + XP_BONUS_META);
  });

  it('respeita o teto do dia', () => {
    // 6 registros (60) + bônus (50) = 110, que não cabe.
    expect(xpOfDay(dia(HOJE, 6, true))).toBe(XP_MAX_POR_DIA);
    expect(xpOfDay(dia(HOJE, 20, true))).toBe(XP_MAX_POR_DIA);
  });

  it('dia inexistente vale zero', () => {
    expect(xpOfDay(undefined)).toBe(0);
  });
});

describe('useGamification — XP no registrar e no desfazer', () => {
  const jogo = () => useGamification.getState();

  beforeEach(() => {
    useGamification.getState().reset();
  });

  /**
   * Registra o copo número `n` do dia, como o app faz — um por vez, com o dia já
   * recalculado. `metaEm` é o copo que fecha a meta.
   */
  function copo(n: number, metaEm = 6) {
    jogo().onEntryAdded({
      date: HOJE,
      volumeMl: 500,
      metGoalNow: n === metaEm,
      days: { [HOJE]: dia(HOJE, n, n >= metaEm) },
    });
  }

  /** Do primeiro copo até o `quantos`-ésimo, uma vez cada. */
  function encher(quantos: number, metaEm = 6) {
    for (let n = 1; n <= quantos; n += 1) copo(n, metaEm);
  }

  it('paga 10 por registro', () => {
    encher(3);

    expect(jogo().xp).toBe(30);
    expect(jogo().xpToday).toBe(30);
  });

  it('paga o bônus no copo que fecha a meta, respeitando o teto', () => {
    encher(6);

    // Os cinco primeiros dão 50; o 6º pediria 60 (10 + bônus) e só cabem 50.
    expect(jogo().xp).toBe(XP_MAX_POR_DIA);
    expect(jogo().xpToday).toBe(XP_MAX_POR_DIA);
  });

  it('não paga nada depois do teto do dia', () => {
    encher(6);
    const antes = jogo().xp;

    copo(7);
    expect(jogo().xp).toBe(antes);
  });

  /**
   * O bug de 05/08/2026: o ganho passava pelo teto e a devolução não. Um 7º copo ganhava
   * 0 e devolvia 10 ao ser desfeito — dez pontos tirados do XP de dias anteriores.
   */
  it('devolve zero ao desfazer um registro que não pagou nada', () => {
    encher(7);
    const antes = jogo().xp;

    jogo().onEntryRemoved({
      date: HOJE,
      volumeMl: 500,
      lostGoal: false,
      dayBefore: dia(HOJE, 7, true),
      dayAfter: dia(HOJE, 6, true),
    });

    expect(jogo().xp).toBe(antes);
  });

  it('devolve exatamente o que o copo pagou quando o teto não entrou', () => {
    encher(3);
    expect(jogo().xp).toBe(30);

    jogo().onEntryRemoved({
      date: HOJE,
      volumeMl: 500,
      lostGoal: false,
      dayBefore: dia(HOJE, 3, false),
      dayAfter: dia(HOJE, 2, false),
    });

    expect(jogo().xp).toBe(20);
  });

  /**
   * A propriedade que fecha o assunto: desfazer e refazer sempre volta ao mesmo XP,
   * quantas voltas sejam. Era isso que não valia — cada volta deslocava o total.
   */
  it('desfazer e refazer devolve o XP ao mesmo lugar', () => {
    encher(7);
    const referencia = jogo().xp;

    for (let volta = 0; volta < 8; volta += 1) {
      jogo().onEntryRemoved({
        date: HOJE,
        volumeMl: 500,
        lostGoal: false,
        dayBefore: dia(HOJE, 7, true),
        dayAfter: dia(HOJE, 6, true),
      });
      jogo().onEntryAdded({
        date: HOJE,
        volumeMl: 500,
        metGoalNow: false,
        days: { [HOJE]: dia(HOJE, 7, true) },
      });
    }

    expect(jogo().xp).toBe(referencia);
  });

  it('desfazer o copo que fechou a meta tira o bônus junto', () => {
    encher(3, 3);
    expect(jogo().xp).toBe(3 * XP_POR_REGISTRO + XP_BONUS_META);

    jogo().onEntryRemoved({
      date: HOJE,
      volumeMl: 500,
      lostGoal: true,
      dayBefore: dia(HOJE, 3, true),
      dayAfter: dia(HOJE, 2, false),
    });

    expect(jogo().xp).toBe(2 * XP_POR_REGISTRO);
  });

  /**
   * O "desfazer" do Histórico alcança dias passados, e ali não existe contador de XP do
   * dia para consultar — a conta tem de sair dos dois estados do dia.
   */
  it('acerta o XP ao desfazer registro de um dia passado', () => {
    encher(3);
    useGamification.setState({ xp: 200 });

    jogo().onEntryRemoved({
      date: '2026-07-30',
      volumeMl: 500,
      lostGoal: false,
      dayBefore: dia('2026-07-30', 4, false),
      dayAfter: dia('2026-07-30', 3, false),
    });

    expect(jogo().xp).toBe(190);
    // O contador de hoje não se mexe: o dia removido é outro.
    expect(jogo().xpToday).toBe(30);
  });

  it('nunca deixa o XP negativo', () => {
    jogo().onEntryRemoved({
      date: HOJE,
      volumeMl: 500,
      lostGoal: true,
      dayBefore: dia(HOJE, 6, true),
      dayAfter: dia(HOJE, 0, false),
    });

    expect(jogo().xp).toBe(0);
    expect(jogo().lifetimeMl).toBe(0);
  });
});
