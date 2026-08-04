/**
 * O **dia lógico** termina às 03:00 locais, não à meia-noite (§3.1 do plano):
 * quem bebe água à 01:30 está fechando o dia anterior.
 *
 * Toda conversão de data do app passa por aqui e usa hora local — nunca UTC (§12).
 */
export const LOGICAL_DAY_START_HOUR = 3;

function format(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Chave do dia lógico ('YYYY-MM-DD') a que este instante pertence. */
export function dayKey(date: Date = new Date()): string {
  const deslocado = new Date(date.getTime());
  deslocado.setHours(deslocado.getHours() - LOGICAL_DAY_START_HOUR);
  return format(deslocado);
}

/** Mesma coisa, a partir de um epoch ms (o `at` de um registro). */
export function dayKeyOf(at: number): string {
  return dayKey(new Date(at));
}

/** Chave do dia anterior a uma chave dada. */
export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return format(date);
}

/**
 * Dia da semana de uma chave de dia. `0` = domingo … `6` = sábado, igual ao
 * `getDay()` do JS e igual ao que `restDay` guarda.
 *
 * Recebe a **chave do dia lógico**, não um `Date`: um registro à 01:00 pertence ao dia
 * anterior, e derivar o dia da semana do relógio daria a resposta errada nessas horas.
 */
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * Meio-dia local do dia dado. Usado como `at` sintético quando um registro
 * antigo não tem hora (migração — §0.1.3).
 */
export function middayOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

/**
 * Milissegundos até a próxima virada do dia lógico (03:00 local).
 *
 * Serve para o app aberto **acordar** na virada: sem isso, quem deixa o app aberto
 * a noite toda continua vendo o dia anterior, porque a chave do dia só é recalculada
 * quando algo dispara um novo render.
 */
export function msUntilNextLogicalDay(from: Date = new Date()): number {
  const proxima = new Date(from.getTime());
  proxima.setHours(LOGICAL_DAY_START_HOUR, 0, 0, 0);
  // Já passou das 03:00 hoje: a próxima virada é amanhã.
  if (proxima.getTime() <= from.getTime()) proxima.setDate(proxima.getDate() + 1);
  return proxima.getTime() - from.getTime();
}
