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

/** Faixa do dia em que o aviso cai. Derivada do minuto do slot, nunca de "agora". */
export type Momento = 'manha' | 'tarde' | 'noite';

/**
 * O que a frase pode saber sobre o dia.
 *
 * `momento` é sempre confiável: vem do minuto do slot, que é fixo desde o
 * agendamento. `fracao` é opcional **e a ausência dela é significativa** — quer dizer
 * "não dá para saber", que é o caso da camada perene e dos dias futuros. Ver o comentário
 * de `grupoDe`.
 */
export type ReminderContext = {
  momento: Momento;
  /** Progresso do dia, 0..1. Ausente quando não se pode afirmar nada sobre ele. */
  fracao?: number;
};

/** Manhã até 12h, tarde até 18h, noite depois. */
export function momentoDe(minutoDoDia: number): Momento {
  const m = ((minutoDoDia % 1440) + 1440) % 1440;
  if (m < 12 * 60) return 'manha';
  if (m < 18 * 60) return 'tarde';
  return 'noite';
}

/** Acima disto, a frase pode falar em "quase". */
const RETA_FINAL_MIN = 0.75;
/** Abaixo disto, e fora da manhã, a frase convida a retomar. */
const RETOMADA_MAX = 0.35;

/**
 * Convite, nunca cobrança (§6.3). Sem emoji, sem culpa, no máximo oito palavras.
 * Nada aqui pode sugerir fracasso: quem passou o dia sem beber já sabe.
 *
 * **Todos os grupos têm exatamente oito frases**, e isso não é estética: o índice do
 * slot avança de 7 em 7 dentro do grupo, e 7 é primo com 8 — o que garante os oito
 * textos distintos antes de repetir. Com um grupo de sete frases, `index * 7 % 7` daria
 * zero sempre e todos os avisos daquele grupo sairiam idênticos.
 */

/** Tom de começo. Serve a qualquer progresso, inclusive meta já batida. */
const MANHA = [
  'O primeiro copo do dia.',
  'Bom dia. Comece com água.',
  'Antes do café, um copo.',
  'A garrafa acordou com você.',
  'Manhã pede água.',
  'Um copo para abrir o dia.',
  'Comece leve: água.',
  'Água primeiro, o resto depois.',
] as const;

/** Tom de pausa no meio do que a pessoa está fazendo. */
const TARDE = [
  'Pausa de dois minutos.',
  'Entre uma tarefa e outra.',
  'A tarde pede água.',
  'Levanta, estica, bebe.',
  'Um copo e volta ao que fazia.',
  'Aproveita a brecha.',
  'Respira e bebe um copo.',
  'Tarde longa, garrafa por perto.',
] as const;

/** Tom de fechamento. Nada de "ainda dá tempo": isso já soa a cobrança. */
const NOITE = [
  'Fim de tarde, hora da água.',
  'Um copo antes de desacelerar.',
  'A noite também conta.',
  'Último trecho do dia.',
  'Desacelera com um copo.',
  'Antes do jantar, água.',
  'A noite é longa. Bebe um pouco.',
  'Fecha o dia com água.',
] as const;

/**
 * Dia pouco andado, da tarde em diante. O trabalho aqui é remover o peso de começar,
 * não apontar o quanto faltou — daí "vale igual", "sem pressa", "só isso".
 */
const RETOMADA = [
  'Um copo agora já muda o dia.',
  'Sem pressa: comece por um copo.',
  'Começar agora vale igual.',
  'Dá para retomar com calma.',
  'Um copo, e o dia melhora.',
  'Nunca é tarde para o primeiro.',
  'Do zero ao primeiro copo.',
  'Um copo. Só isso.',
] as const;

/**
 * Perto da meta. Fala em "quase" e nunca em volume exato: um número escrito no
 * agendamento envelhece se o progresso mudar sem o app abrir, e um lembrete que erra a
 * conta perde a confiança de quem lê.
 */
const RETA_FINAL = [
  'Falta pouco para a meta.',
  'Você está quase lá.',
  'A meta está logo aí.',
  'Reta final de hoje.',
  'Quase fechando o dia.',
  'Mais um copo e você fecha.',
  'A meta está ao alcance.',
  'Está quase completo.',
] as const;

const GRUPOS = { MANHA, TARDE, NOITE, RETOMADA, RETA_FINAL } as const;

export const REMINDER_PHRASES_COUNT = Object.values(GRUPOS).reduce((s, g) => s + g.length, 0);

/**
 * Escolhe o grupo. A ordem das condições é o desenho:
 *
 * O progresso ganha do horário quando é conhecido, porque diz mais — "falta pouco" é
 * melhor aviso que "a tarde pede água". Mas **estar em zero pela manhã não é atraso**,
 * é o normal de quem acordou, então `RETOMADA` só entra da tarde em diante.
 *
 * Sem `fracao`, cai no horário. É o caminho da camada perene e dos dias futuros, e é o
 * certo: não dá para prometer "falta pouco" num texto que vai repetir amanhã.
 */
function grupoDe({ momento, fracao }: ReminderContext): readonly string[] {
  if (fracao !== undefined) {
    if (fracao >= RETA_FINAL_MIN) return RETA_FINAL;
    if (fracao < RETOMADA_MAX && momento !== 'manha') return RETOMADA;
  }
  if (momento === 'manha') return MANHA;
  if (momento === 'tarde') return TARDE;
  return NOITE;
}

/**
 * Frase do slot. Determinística pelo dia, pelo índice **e** pelo contexto: dois
 * lembretes do mesmo dia nunca saem iguais, e reagendar não reescreve o que já foi
 * enviado — `syncReminders()` roda a cada registro, e frase sorteada na hora faria o
 * texto de um mesmo horário mudar várias vezes ao dia.
 */
export function phraseFor(dayKey: string, index: number, ctx: ReminderContext): string {
  const grupo = grupoDe(ctx);
  let h = 0;
  for (let i = 0; i < dayKey.length; i += 1) {
    h = (h * 31 + dayKey.charCodeAt(i)) % 100000;
  }
  return grupo[(h + index * 7) % grupo.length];
}
