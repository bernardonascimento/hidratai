/**
 * Estado emocional da Gotinha (§8.2) e a fala que combina com ele.
 *
 * Existe como módulo puro porque a escolha estava espalhada: a tela Hoje decidia
 * por contagem de registros, o Cantinho por outra régua, e a frase por uma
 * terceira. Três lugares para a mesma pergunta divergem com o tempo.
 *
 * **Nunca triste, nunca murcho.** Culpar quem bebeu pouco está fora do vocabulário
 * do app: o pior estado possível é `atenta`, que é curiosidade, não repreensão.
 */
export type Mood = 'neutra' | 'animada' | 'radiante' | 'atenta';

/** Acima disto a Gotinha comemora. */
const RADIANTE = 1;
/** A partir daqui ela já está animada. */
const ANIMADA = 0.25;
/** Abaixo disto, com o dia acabando, ela fica atenta. */
const ATENTA_MAX = 0.4;
/**
 * Fração da janela acordado a partir da qual o dia conta como "avançado". 65% de um
 * dia que vai das 7h às 23h é por volta das 17h30 — tarde o bastante para valer um
 * olhar curioso, cedo o bastante para dar tempo de reagir.
 */
const DIA_AVANCADO = 0.65;

type MoodInput = {
  /** Hidratação sobre a meta: 0 a 1+. */
  progress: number;
  /** Minutos desde a meia-noite, agora. */
  minutesOfDay: number;
  wakeMinutes: number;
  sleepMinutes: number;
};

/** Já passou boa parte do tempo em que a pessoa está acordada. */
function diaAvancado({ minutesOfDay, wakeMinutes, sleepMinutes }: MoodInput): boolean {
  const janela = sleepMinutes - wakeMinutes;
  if (janela <= 0) return false;
  return (minutesOfDay - wakeMinutes) / janela >= DIA_AVANCADO;
}

/**
 * Estado da Gotinha. A ordem das perguntas é a precedência: bater a meta vence
 * tudo, e `atenta` vence `animada` — quem está em 30% às 20h precisa mais de um
 * empurrão do que de um elogio.
 */
export function mascotMood(input: MoodInput): Mood {
  if (input.progress >= RADIANTE) return 'radiante';
  if (input.progress < ATENTA_MAX && diaAvancado(input)) return 'atenta';
  if (input.progress >= ANIMADA) return 'animada';
  return 'neutra';
}

/**
 * Fala curta que acompanha o estado. Convite, nunca cobrança — a `atenta` avisa que
 * ainda dá tempo, não que já era.
 */
export function mascotPhrase(mood: Mood, hasEntries: boolean): string {
  if (!hasEntries) return 'Vamos começar o dia';

  switch (mood) {
    case 'radiante':
      return 'No ritmo. Que leveza!';
    case 'atenta':
      return 'Ainda dá tempo hoje';
    case 'animada':
      return 'Bom caminho';
    default:
      return 'Bom começo';
  }
}
