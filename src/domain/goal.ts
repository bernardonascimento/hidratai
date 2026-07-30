// Meta diária — §4.1 do plano.
// É heurística de app de hábito, não prescrição clínica.

import type { Activity, Climate, Sex } from './types';

export const GOAL_MIN_ML = 1200;
export const GOAL_MAX_ML = 4000;
export const DEFAULT_GOAL_ML = 2000;

/**
 * O teto existe por segurança: beber água em excesso também faz mal, então o app
 * não obedece calado a uma meta absurda (§4.1).
 */
export function clampGoal(ml: number): number {
  if (!Number.isFinite(ml)) return DEFAULT_GOAL_ML;
  return Math.min(GOAL_MAX_ML, Math.max(GOAL_MIN_ML, Math.round(ml)));
}

/** true quando o valor pedido teve de ser limitado — a UI explica o porquê. */
export function goalWasClamped(ml: number): boolean {
  return clampGoal(ml) !== Math.round(ml);
}

export function roundTo50(ml: number): number {
  return Math.round(ml / 50) * 50;
}

const ACTIVITY_BONUS: Record<Activity, number> = {
  baixa: 0,
  media: 350,
  alta: 700,
};

/**
 * Meta diária a partir do perfil (§4.1):
 * `peso*35 + (homem ? 250) + atividade + (clima quente ? 500)`, arredondada a 50
 * e limitada a 1200–4000.
 *
 * É heurística de app de hábito — a tela de resultado do onboarding diz isso.
 */
export function computeGoal(profile: {
  weightKg: number;
  sex: Sex;
  activity: Activity;
  climate: Climate;
}): number {
  const base = profile.weightKg * 35;
  const porSexo = profile.sex === 'm' ? 250 : 0;
  const porAtividade = ACTIVITY_BONUS[profile.activity];
  const porClima = profile.climate === 'quente' ? 500 : 0;

  return clampGoal(roundTo50(base + porSexo + porAtividade + porClima));
}

/** Nível a partir do XP (§7.2). O XP não compra nada — só existe. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

/** XP total necessário para alcançar um nível. */
export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 100;
}

/** Progresso 0..1 dentro do nível atual, para a barra de Conquistas. */
export function levelProgress(xp: number): number {
  const nivel = levelFromXp(xp);
  const inicio = xpForLevel(nivel);
  const fim = xpForLevel(nivel + 1);
  if (fim === inicio) return 0;
  return Math.min(1, Math.max(0, (xp - inicio) / (fim - inicio)));
}
