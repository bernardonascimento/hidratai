export type GardenElementId =
  | 'muda'
  | 'pedrinhas'
  | 'poca'
  | 'planta'
  | 'nuvem'
  | 'cacto'
  | 'pedra'
  | 'flor'
  | 'samambaia'
  | 'regador'
  | 'sol'
  | 'peixinho';

export type GardenElement = {
  id: GardenElementId;
  name: string;
  /** Custo em gotas — cada dia com meta batida rende uma. */
  cost: number;
  /** Posição no cenário, em fração da caixa (0..1). */
  x: number;
  y: number;
  /** Escala relativa do desenho. */
  scale: number;
  /** Ordem de desenho: menor fica atrás. */
  layer: number;
};

/**
 * O Cantinho da Gotinha (§4.2 do PLANO-GAMIFICACAO).
 *
 * A moeda é **dia cumprido**, não volume: consistência, não quantidade. Os custos
 * crescem para dar horizonte de meses, e o usuário escolhe a ordem — escolha é
 * adesão. **Nada regride por ausência** (§3.4): faltar só não rende gota nova.
 */
export const GARDEN_ELEMENTS: GardenElement[] = [
  { id: 'muda', name: 'Muda', cost: 1, x: 0.28, y: 0.78, scale: 1, layer: 3 },
  { id: 'pedrinhas', name: 'Pedrinhas', cost: 2, x: 0.6, y: 0.86, scale: 1, layer: 2 },
  { id: 'poca', name: 'Poça', cost: 3, x: 0.78, y: 0.82, scale: 1, layer: 1 },
  { id: 'planta', name: 'Plantinha', cost: 5, x: 0.14, y: 0.72, scale: 1, layer: 3 },
  { id: 'nuvem', name: 'Nuvem', cost: 6, x: 0.2, y: 0.16, scale: 1, layer: 1 },
  { id: 'cacto', name: 'Cacto', cost: 7, x: 0.86, y: 0.7, scale: 1, layer: 3 },
  { id: 'pedra', name: 'Pedra', cost: 8, x: 0.44, y: 0.84, scale: 1, layer: 2 },
  { id: 'flor', name: 'Flor', cost: 10, x: 0.7, y: 0.72, scale: 1, layer: 4 },
  { id: 'samambaia', name: 'Samambaia', cost: 14, x: 0.06, y: 0.58, scale: 1, layer: 2 },
  { id: 'regador', name: 'Regador', cost: 18, x: 0.9, y: 0.86, scale: 1, layer: 4 },
  { id: 'sol', name: 'Sol', cost: 25, x: 0.84, y: 0.14, scale: 1, layer: 1 },
  { id: 'peixinho', name: 'Peixinho', cost: 35, x: 0.5, y: 0.2, scale: 1, layer: 4 },
];

export function elementById(id: string): GardenElement | undefined {
  return GARDEN_ELEMENTS.find((e) => e.id === id);
}

/** O que dá para desbloquear com as gotas em mão, do mais barato ao mais caro. */
export function affordable(drops: number, unlocked: string[]): GardenElement[] {
  return GARDEN_ELEMENTS.filter((e) => !unlocked.includes(e.id) && e.cost <= drops).sort(
    (a, b) => a.cost - b.cost,
  );
}

/** Próximo alvo: o mais barato ainda bloqueado. Dá horizonte a quem está começando. */
export function nextTarget(unlocked: string[]): GardenElement | undefined {
  return GARDEN_ELEMENTS.filter((e) => !unlocked.includes(e.id)).sort((a, b) => a.cost - b.cost)[0];
}

export function totalCost(): number {
  return GARDEN_ELEMENTS.reduce((soma, e) => soma + e.cost, 0);
}

/** Elementos visíveis no cenário, já na ordem de desenho. */
export function sceneElements(unlocked: string[]): GardenElement[] {
  return GARDEN_ELEMENTS.filter((e) => unlocked.includes(e.id)).sort((a, b) => a.layer - b.layer);
}
