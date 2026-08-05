// Formatação de volumes. Uma unidade por linha: nunca "900 ml / 2,0 L" (§0.1 div. 4).
// `oz` é só exibição (§4.3) e entra junto com useSettings; hoje só ml/L.

export type VolumeUnit = 'ml' | 'L';

export type FormattedPair = {
  value: string;
  total: string;
  unit: VolumeUnit;
};

function oneDecimal(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/** Um décimo de litro em ml — a menor diferença que a exibição em litros expressa. */
const DECIMO_L = 100;

/**
 * Litros com uma decimal, arredondando para baixo e para cima.
 *
 * As duas contam em **décimos inteiros** antes de dividir. Fazer `Math.floor(ml/1000*10)`
 * erra por ponto flutuante: `2.9 * 10` dá 28.999999999999996 em IEEE-754, e o piso
 * viraria 2,8.
 */
function pisoL(ml: number): string {
  return oneDecimal(Math.floor(ml / DECIMO_L) / 10);
}
function tetoL(ml: number): string {
  return oneDecimal(Math.ceil(ml / DECIMO_L) / 10);
}

/**
 * Formata "bebido / meta" com **a mesma unidade nos dois lados**, escolhida pela
 * meta: `0,9 / 2,0 L` ou `600 / 900 ml`.
 *
 * ## Por que piso no bebido e teto na meta
 *
 * Em litros a tela só tem uma decimal, então dois valores diferentes podem escrever
 * o mesmo número. Arredondando os dois lados, `2950 / 3000` saía como `3,0 de 3,0 L`
 * — a tela dizia que a pessoa chegou, e a garrafa continuava azul, porque de fato
 * faltavam 50 ml. Foi assim que um caso real (meta 3050, bebido 3000) ficou
 * impossível de entender: os dois números iguais e nada de verde.
 *
 * Com piso no bebido e teto na meta, **número igual passa a garantir meta batida**:
 * `piso(v) == teto(m)` só acontece quando os dois caem no mesmo décimo *e* já são
 * múltiplos exatos dele, o que força `v == m`. Nenhum outro par consegue empatar.
 *
 * O erro que sobra é sempre para o lado seguro: quem tem 2990 lê `2,9 de 3,0` e vai
 * beber mais um pouco. O contrário mandava parar antes da hora.
 */
export function formatPair(valueMl: number, totalMl: number): FormattedPair {
  if (totalMl >= 1000) {
    return { value: pisoL(valueMl), total: tetoL(totalMl), unit: 'L' };
  }
  return { value: String(Math.floor(valueMl)), total: String(Math.ceil(totalMl)), unit: 'ml' };
}

/** Volume isolado, para pills e botões: `300 ml` · `1,4 L`. */
export function formatVolume(ml: number): string {
  if (ml < 1000) return `${Math.round(ml)} ml`;
  return `${oneDecimal(ml / 1000)} L`;
}

/**
 * Minutos desde a meia-noite como relógio de 24h: `450` vira `07:30`.
 * Dá a volta em vez de estourar, para minuto fora de 0..1439 não virar `25:00`.
 */
export function formatClock(minutes: number): string {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
