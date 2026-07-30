/**
 * Horários e frases dos lembretes (§6.1 e §6.3 do plano). Módulo **puro**: nada
 * daqui toca `expo-notifications`. Quem agenda é `lib/notifications.ts`, e é assim
 * que essa conta fica testável sem simulador.
 */

/** Intervalo alvo entre lembretes. É um alvo, não uma promessa: a janela manda. */
export const DEFAULT_INTERVAL_MIN = 90;
/** Intervalos oferecidos nos Ajustes. */
export const INTERVAL_OPTIONS = [60, 90, 120, 180] as const;

/** Folga depois de acordar: ninguém quer aviso de água com o despertador. */
const APOS_ACORDAR_MIN = 30;
/** Folga antes de dormir: beber na hora de deitar rende ida ao banheiro. */
const ANTES_DE_DORMIR_MIN = 60;

/** Menos que isto não é lembrete, é enxame; mais que isto ninguém lê. */
const MIN_SLOTS = 4;
const MAX_SLOTS = 15;

/**
 * Arredondamento dos horários. Distribuir a janela por igual dá coisas como 20:33,
 * que parece defeito e não escolha; em múltiplos de 5 o lembrete lê como
 * intencional. Distorce o espaçamento em no máximo 2 minutos.
 */
const PASSO_RELOGIO = 5;

export type ReminderPrefs = {
  enabled: boolean;
  intervalMinutes: number;
};

export const DEFAULT_REMINDERS: ReminderPrefs = {
  enabled: false,
  intervalMinutes: DEFAULT_INTERVAL_MIN,
};

/**
 * Minutos desde a meia-noite em que cada lembrete cai.
 *
 * A janela é `[acordar + 30, dormir - 60]`. Rotina curta (ou invertida, de quem
 * dorme de dia) devolve lista vazia em vez de horário absurdo: melhor não avisar
 * do que avisar às 4 da manhã.
 *
 * ## O intervalo é honrado, não diluído
 *
 * A primeira versão espalhava `n` avisos pela janela inteira (`passo = duração/n`),
 * e o intervalo escolhido era só um alvo: com janela de 14h30, "a cada 60 min"
 * virava 72 min por causa do teto de avisos. A interface prometia o que não
 * entregava. Agora o passo **é** o intervalo pedido, e o teto apenas corta a cauda:
 * quem escolhe 60 recebe de 60 em 60, e o dia pode acabar antes do fim da janela.
 *
 * A exceção é a janela apertada, onde honrar o intervalo daria menos avisos que o
 * mínimo. Aí sim os `MIN_SLOTS` são distribuídos por igual — o alternativa seria
 * agendar fora da janela, o que é pior.
 */
export function reminderSlots(
  wakeMinutes: number,
  sleepMinutes: number,
  intervalMinutes: number = DEFAULT_INTERVAL_MIN,
): number[] {
  const inicio = wakeMinutes + APOS_ACORDAR_MIN;
  const fim = sleepMinutes - ANTES_DE_DORMIR_MIN;
  const duracao = fim - inicio;

  // Sem espaço para dois lembretes espaçados, não vale acordar ninguém.
  if (duracao < intervalMinutes) return [];

  // Quantos cabem andando de `intervalMinutes` em `intervalMinutes` a partir do
  // início da janela, sem passar do fim.
  const cabem = Math.floor(duracao / intervalMinutes) + 1;

  if (cabem >= MIN_SLOTS) {
    const n = Math.min(MAX_SLOTS, cabem);
    // Já múltiplo de 5 quando o intervalo é, e o arredondamento protege os que não.
    return Array.from(
      { length: n },
      (_, i) => Math.round((inicio + i * intervalMinutes) / PASSO_RELOGIO) * PASSO_RELOGIO,
    );
  }

  // Janela apertada: distribui o mínimo por igual para não sair dela.
  const passo = duracao / MIN_SLOTS;
  return Array.from(
    { length: MIN_SLOTS },
    (_, i) => Math.round((inicio + i * passo) / PASSO_RELOGIO) * PASSO_RELOGIO,
  );
}

/**
 * Subconjunto perene da camada B (§6.2): os lembretes que ficam agendados como
 * `DAILY` e sobrevivem a semanas sem abrir o app.
 *
 * Escolhe pelas pontas e pelo meio em vez dos primeiros da lista: se o usuário
 * sumir por um mês, o que resta precisa cobrir o dia inteiro, não só a manhã.
 */
export function perennialSlots(slots: number[], quantos = 4): number[] {
  if (slots.length <= quantos) return [...slots];

  const passo = (slots.length - 1) / (quantos - 1);
  const indices = Array.from({ length: quantos }, (_, i) => Math.round(i * passo));
  return [...new Set(indices)].map((i) => slots[i]);
}

/** `540` vira `{ hour: 9, minute: 0 }`, que é o formato do trigger diário. */
export function hourMinute(minutes: number): { hour: number; minute: number } {
  const total = ((minutes % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/**
 * Convite, nunca cobrança (§6.3). Sem emoji, sem culpa, no máximo oito palavras.
 * Nada aqui pode sugerir fracasso: quem passou o dia sem beber já sabe.
 */
const FRASES = [
  'Um copo agora cai bem.',
  'Hora da água. Só um copo.',
  'Que tal um copo de água?',
  'Sua garrafa está por aí?',
  'Pausa curta: bebe um pouco.',
  'A Gotinha lembrou de você.',
  'Um copo e volta ao que fazia.',
  'Água fresca, dois minutos.',
  'Bora molhar a garganta.',
  'Um gole agora, outro depois.',
  'Seu corpo aceita um copo.',
  'Lembrete leve: beba água.',
  'Água antes da próxima tarefa.',
  'Só um copo, sem pressa.',
  'Hidratar agora é mais fácil.',
  'A garrafa está esperando.',
  'Aproveite e beba um copo.',
  'Um copo cabe nesse minuto.',
  'Água: o de sempre, agora.',
  'Passando para lembrar da água.',
];

export const REMINDER_PHRASES_COUNT = FRASES.length;

/**
 * Frase do slot. Determinística pelo dia **e** pelo índice: dois lembretes do
 * mesmo dia nunca saem iguais, e reagendar não reescreve o que já foi enviado —
 * `syncReminders()` roda a cada registro, e frase sorteada na hora faria o texto
 * de um mesmo horário mudar várias vezes ao dia.
 */
export function phraseFor(dayKey: string, index: number): string {
  let h = 0;
  for (let i = 0; i < dayKey.length; i += 1) {
    h = (h * 31 + dayKey.charCodeAt(i)) % 100000;
  }
  return FRASES[(h + index * 7) % FRASES.length];
}
