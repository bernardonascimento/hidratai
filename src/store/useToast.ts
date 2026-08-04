import { create } from 'zustand';

import type { VictoryEvent } from '@/domain/progressEvents';

export type Aviso =
  | { kind: 'desfazer'; entryId: string; volumeMl: number }
  | { kind: 'vitoria'; evento: VictoryEvent };

/**
 * Fila única de avisos, em store própria e **sem `persist`**.
 *
 * Mora fora da tela porque o toast é desenhado no layout raiz, acima do navegador de
 * abas — é isso que permite a ele passar por cima da tabBar. Estado local na tela Hoje
 * não alcançaria lá.
 *
 * Nada vai para o disco: um "desfazer" que sobrevive a fechar o app ofereceria apagar um
 * registro que a pessoa já esqueceu que fez, e uma comemoração guardada apareceria fora
 * de hora, sem relação com o toque que a gerou.
 *
 * ## A prioridade, e por que é uma fila e não um slot
 *
 * A vitória ganha do desfazer, sempre. Um mesmo toque pode gerar as duas coisas —
 * registrar água oferece desfazer **e** pode subir de nível —, e nesse instante o que
 * importa dizer é que a pessoa evoluiu. O desfazer continua existindo no Histórico.
 *
 * É fila e não um slot porque um toque pode render **várias** vitórias de uma vez:
 * bater a meta pode subir de nível, fechar uma conquista de dias seguidos e fechar outra
 * de litros no mesmo registro. Empilhadas, elas viram uma cascata de boa notícia; num
 * slot único, duas se atropelariam e só a última apareceria.
 */
type ToastState = {
  fila: Aviso[];
  /** Enfileira vitórias e **descarta** qualquer desfazer pendente. */
  celebrar: (eventos: VictoryEvent[]) => void;
  /** Pede o desfazer. Ignorado se há vitória na fila — ela tem prioridade. */
  pedirDesfazer: (aviso: { entryId: string; volumeMl: number }) => void;
  /** Consome o aviso da frente, quando ele expira ou é usado. */
  avancar: () => void;
  limpar: () => void;
};

export const useToast = create<ToastState>()((set, get) => ({
  fila: [],

  celebrar: (eventos) => {
    if (eventos.length === 0) return;
    set({
      fila: [
        // Só as vitórias sobrevivem: o desfazer pendente é descartado aqui, e é
        // exatamente isso que dá a prioridade.
        ...get().fila.filter((a) => a.kind === 'vitoria'),
        ...eventos.map((evento) => ({ kind: 'vitoria' as const, evento })),
      ],
    });
  },

  pedirDesfazer: (aviso) => {
    if (get().fila.some((a) => a.kind === 'vitoria')) return;
    set({ fila: [{ kind: 'desfazer', ...aviso }] });
  },

  avancar: () => set({ fila: get().fila.slice(1) }),

  limpar: () => set({ fila: [] }),
}));
