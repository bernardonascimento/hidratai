// Meta diária — §4.1 do plano.
// É heurística de app de hábito, não prescrição clínica.

import type { Activity, Climate } from './types';

export const GOAL_MIN_ML = 1200;
export const GOAL_MAX_ML = 4000;
export const DEFAULT_GOAL_ML = 2000;

/**
 * Passo da meta, em mililitros — **o mesmo passo da exibição**.
 *
 * A meta vive entre 1200 e 4000, ou seja, sempre é escrita em litros com uma
 * decimal (`formatVolume`), e uma decimal de litro são 100 ml. Enquanto o passo foi
 * de 50, metade dos valores possíveis não tinha como ser lida na tela: 2950, 3000 e
 * 3050 escrevem todos `3,0 L`. Dois toques seguidos no ± mostravam o mesmo número, e
 * não havia como saber em qual dos três se parou.
 *
 * Isso deu bug de verdade, achado em 05/08/2026: descendo da sugestão de 3900 a
 * pessoa parou onde a tela dizia `3,0 L` e ficou em **3050**. Depois bebeu 3000 e a
 * garrafa mostrou `3,0 de 3,0 L` sem ficar verde — certíssima, porque 3000 < 3050,
 * mas impossível de entender.
 *
 * Regra que fica: **valor gravado e valor mostrado com a mesma granularidade**. Ao
 * mexer no passo, olhe `formatVolume` no mesmo commit.
 */
export const GOAL_STEP_ML = 100;

/** A meta no múltiplo de `GOAL_STEP_ML` mais próximo. */
export function snapGoal(ml: number): number {
  return Math.round(ml / GOAL_STEP_ML) * GOAL_STEP_ML;
}

/**
 * O teto existe por segurança: beber água em excesso também faz mal, então o app
 * não obedece calado a uma meta absurda (§4.1).
 *
 * O `snapGoal` vem antes do limite, e não depois, porque os dois extremos já são
 * múltiplos de 100: assim nenhum valor fora do passo chega ao disco, venha da conta
 * do perfil, do ± ou de um estado antigo persistido.
 */
export function clampGoal(ml: number): number {
  if (!Number.isFinite(ml)) return DEFAULT_GOAL_ML;
  return Math.min(GOAL_MAX_ML, Math.max(GOAL_MIN_ML, snapGoal(ml)));
}

/**
 * true quando o valor pedido teve de ser **limitado** — a UI explica o porquê.
 * Compara com o valor já ajustado ao passo: cair de 3050 para 3000 é acerto de
 * granularidade, não é bater no teto, e não merece aviso.
 */
export function goalWasClamped(ml: number): boolean {
  return Number.isFinite(ml) && clampGoal(ml) !== snapGoal(ml);
}

const ACTIVITY_BONUS: Record<Activity, number> = {
  baixa: 0,
  media: 350,
  alta: 700,
};

/**
 * Meta diária a partir do perfil (§4.1):
 * `peso*35 + atividade + (clima quente ? 500)`, ajustada ao passo de 100 e limitada
 * a 1200–4000.
 *
 * **Sexo não entra, e o app não pergunta.** Havia um `+250 se homem` aqui, e ele era
 * inalcançável: `sex` nunca teve tela — nem no onboarding nem em Ajustes — então todo
 * perfil valia o padrão `'na'` e o termo nunca somava nada. Achado em 07/08/2026.
 *
 * Removido em vez de ganhar uma pergunta, por decisão de produto: o app não trata sexo.
 * Como ninguém conseguia gravar `'m'`, **nenhuma meta existente muda** — é remoção de
 * código morto, não mudança de comportamento.
 *
 * É heurística de app de hábito — a tela de resultado do onboarding diz isso.
 */
export function computeGoal(profile: {
  weightKg: number;
  activity: Activity;
  climate: Climate;
}): number {
  const base = profile.weightKg * 35;
  const porAtividade = ACTIVITY_BONUS[profile.activity];
  const porClima = profile.climate === 'quente' ? 500 : 0;

  return clampGoal(base + porAtividade + porClima);
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
