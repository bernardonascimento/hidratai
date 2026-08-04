export type GardenElementId =
  // Chão — a faixa de baixo, onde as coisas se apoiam.
  | 'muda'
  | 'pedrinhas'
  | 'poca'
  | 'planta'
  | 'cacto'
  | 'pedra'
  | 'flor'
  | 'samambaia'
  | 'regador'
  | 'cogumelo'
  | 'tulipa'
  | 'grama'
  | 'grama4'
  | 'pedrinhas2'
  | 'girassol'
  | 'banquinho'
  // Meio — arbustos e coisas que sobem.
  | 'arbusto'
  | 'arvorezinha'
  | 'trepadeira'
  | 'varal'
  // Céu — o vão de cima.
  | 'nuvem'
  | 'nuvem2'
  | 'sol'
  | 'peixinho'
  | 'passarinho'
  | 'borboleta'
  | 'arcoiris';

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
 *
 * ## Por que 27, e por que com `scale`
 *
 * Eram 12, somando 134 gotas — 134 dias com meta batida, uns seis meses a cinco dias
 * por semana. Depois disso as gotas acumulavam sem ter no que gastar, e um app de
 * hábito perder o horizonte no sexto mês é perder justo quando o hábito ia pegar. As 27
 * somam 633 gotas: cerca de dois anos e meio.
 *
 * Mais que dobrar **não** podia ser dobrar as peças de 84pt: o cenário tem ~303×250
 * numa tela de 375, e 27 peças desse tamanho seriam uma pilha. O campo `scale` existia e
 * estava em 1 para todos — agora ele trabalha. Três portes:
 *
 * - **1.0** para as peças-personagem, que a pessoa desbloqueia e quer ver (árvore, sol,
 *   girassol, arco-íris);
 * - **0.8** para as de porte médio;
 * - **0.55–0.65** para adereços de chão (pedrinhas, cogumelo, grama), que existem para
 *   preencher e não para roubar atenção.
 *
 * ## As três faixas
 *
 * ## As faixas, e o vão da Gotinha
 *
 * As posições foram acertadas **olhando a tela**, uma a uma, não calculadas: céu em cima,
 * uma fileira de chão em y=0.88–0.92, os vasos à direita e árvore/arbusto/girassol à
 * esquerda.
 *
 * A Gotinha é desenhada por cima de tudo, com 92pt, centrada e a 56pt do fundo — isso a
 * coloca em x de 0.35 a 0.65 e y de 0.41 a 0.78, e esse retângulo fica **vazio de
 * propósito**. Há teste para ele e para o corte nas bordas laterais; se a Gotinha mudar
 * de altura no `GardenScene`, os números do teste mudam junto.
 */
export const GARDEN_ELEMENTS: GardenElement[] = [
  // ---- A fileira do chão, da esquerda para a direita ----
  // grama · tulipa · grama · pedrinhas · pedra · pedrinhas
  { id: 'grama', name: 'Grama', cost: 2, x: 0.06, y: 0.92, scale: 0.6, layer: 2 },
  { id: 'tulipa', name: 'Tulipa', cost: 16, x: 0.18, y: 0.88, scale: 0.8, layer: 4 },
  { id: 'grama4', name: 'Grama', cost: 26, x: 0.29, y: 0.92, scale: 0.6, layer: 2 },
  { id: 'pedrinhas', name: 'Pedrinhas', cost: 3, x: 0.41, y: 0.92, scale: 0.55, layer: 2 },
  { id: 'pedra', name: 'Pedra', cost: 8, x: 0.53, y: 0.92, scale: 0.6, layer: 2 },
  { id: 'pedrinhas2', name: 'Pedrinhas', cost: 33, x: 0.64, y: 0.92, scale: 0.55, layer: 2 },
  // Cogumelo saiu da fileira para não bater na tulipa.
  { id: 'cogumelo', name: 'Cogumelo', cost: 6, x: 0.76, y: 0.88, scale: 0.75, layer: 4 },

  // ---- Chão, lado esquerdo (x até 0.34) ----
  { id: 'muda', name: 'Muda', cost: 1, x: 0.92, y: 0.64, scale: 0.8, layer: 3 },
  { id: 'planta', name: 'Plantinha', cost: 4, x: 0.8, y: 0.5, scale: 0.8, layer: 3 },
  { id: 'banquinho', name: 'Banquinho', cost: 30, x: 0.33, y: 0.76, scale: 0.7, layer: 3 },

  // ---- Chão, lado direito (x de 0.66) ----
  { id: 'poca', name: 'Poça', cost: 5, x: 0.53, y: 0.8, scale: 1, layer: 1 },
  { id: 'flor', name: 'Flor', cost: 10, x: 0.68, y: 0.64, scale: 0.7, layer: 4 },
  { id: 'cacto', name: 'Cacto', cost: 14, x: 0.68, y: 0.4, scale: 0.8, layer: 3 },
  { id: 'regador', name: 'Regador', cost: 20, x: 0.78, y: 0.73, scale: 0.7, layer: 4 },

  // ---- Meio. Nada entre x 0.35 e 0.65 abaixo de y 0.54: é o vão da Gotinha ----
  { id: 'samambaia', name: 'Samambaia', cost: 12, x: 0.92, y: 0.4, scale: 0.8, layer: 2 },
  { id: 'arbusto', name: 'Arbusto', cost: 9, x: 0.1, y: 0.7, scale: 0.7, layer: 2 },
  { id: 'trepadeira', name: 'Trepadeira', cost: 25, x: 0.88, y: 0.89, scale: 0.65, layer: 2 },
  { id: 'arvorezinha', name: 'Árvore', cost: 55, x: 0.28, y: 0.42, scale: 1, layer: 2 },
  { id: 'girassol', name: 'Girassol', cost: 40, x: 0.1, y: 0.52, scale: 1, layer: 3 },
  { id: 'varal', name: 'Varal', cost: 60, x: 0.5, y: 0.36, scale: 0.8, layer: 1 },

  // ---- Céu ----
  { id: 'nuvem2', name: 'Nuvem', cost: 22, x: 0.55, y: 0.14, scale: 0.8, layer: 1 },
  { id: 'nuvem', name: 'Nuvem', cost: 7, x: 0.4, y: 0.14, scale: 0.8, layer: 1 },
  { id: 'sol', name: 'Sol', cost: 18, x: 0.88, y: 0.128, scale: 0.8, layer: 1 },
  { id: 'borboleta', name: 'Borboleta', cost: 52, x: 0.8, y: 0.322, scale: 0.6, layer: 4 },
  { id: 'passarinho', name: 'Passarinho', cost: 35, x: 0.7, y: 0.14, scale: 0.6, layer: 4 },
  { id: 'peixinho', name: 'Peixinho', cost: 45, x: 0.33, y: 0.66, scale: 0.65, layer: 4 },
  { id: 'arcoiris', name: 'Arco-íris', cost: 75, x: 0.14, y: 0.1, scale: 1, layer: 1 },
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
