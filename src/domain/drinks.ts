import type { Drink } from './types';

/**
 * Catálogo de bebidas. Os fatores de hidratação são **coeficientes de tracker de
 * hábito, não valores clínicos** (§4.2 do plano).
 *
 * Por ora só existe a água: a tabela completa das 13 bebidas entra na F2, junto
 * com a tela que permite escolhê-las. Registrar as outras aqui antes disso só
 * criaria dado que nenhuma tela sabe ler.
 */
export const WATER_DRINK_ID = 'agua';

export const DRINKS: Drink[] = [
  {
    id: WATER_DRINK_ID,
    name: 'Água',
    icon: 'glass-water',
    tint: 'agua',
    hydration: 1,
    defaultMl: 250,
  },
];

export function findDrink(id: string): Drink | undefined {
  return DRINKS.find((d) => d.id === id);
}

/** Fator de hidratação da bebida; 1 para id desconhecido (bebida apagada). */
export function hydrationOf(id: string): number {
  return findDrink(id)?.hydration ?? 1;
}
