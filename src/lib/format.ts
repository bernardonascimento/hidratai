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

/**
 * Formata "bebido / meta" com **a mesma unidade nos dois lados**, escolhida pela
 * meta: `0,9 / 2,0 L` ou `600 / 900 ml`.
 */
export function formatPair(valueMl: number, totalMl: number): FormattedPair {
  if (totalMl >= 1000) {
    return { value: oneDecimal(valueMl / 1000), total: oneDecimal(totalMl / 1000), unit: 'L' };
  }
  return { value: String(Math.round(valueMl)), total: String(Math.round(totalMl)), unit: 'ml' };
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
