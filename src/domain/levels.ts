import { levelFromXp } from './goal';

export type Stage = {
  id: string;
  name: string;
  /** Nível mínimo do estágio. */
  from: number;
};

/**
 * Estágios do §4.4: o nível deixa de ser um número solto e passa a ter nome.
 * A escala segue a metáfora da água acumulando — de gota a oceano.
 */
export const STAGES: Stage[] = [
  { id: 'gota', name: 'Gota', from: 1 },
  { id: 'poca', name: 'Poça', from: 3 },
  { id: 'riacho', name: 'Riacho', from: 5 },
  { id: 'rio', name: 'Rio', from: 7 },
  { id: 'cachoeira', name: 'Cachoeira', from: 10 },
  { id: 'oceano', name: 'Oceano', from: 14 },
];

export function stageForLevel(level: number): Stage {
  let atual = STAGES[0];
  for (const estagio of STAGES) {
    if (level >= estagio.from) atual = estagio;
  }
  return atual;
}

export function stageForXp(xp: number): Stage {
  return stageForLevel(levelFromXp(xp));
}

/** Próximo estágio, ou null quando já está no último. */
export function nextStage(level: number): Stage | null {
  return STAGES.find((e) => e.from > level) ?? null;
}
