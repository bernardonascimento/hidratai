import { create } from 'zustand';

import type { UndoAviso } from '@/components/UndoToast';

/**
 * Aviso de desfazer, em store própria e **sem `persist`**.
 *
 * Mora fora da tela porque o toast é desenhado no layout raiz, acima do navegador
 * de abas — é isso que permite a ele passar por cima da tabBar. Estado local na tela
 * Hoje não alcançaria lá.
 *
 * Nada aqui vai para o disco: um "desfazer" que sobrevive a fechar o app ofereceria
 * apagar um registro que a pessoa já esqueceu que fez.
 */
type UndoToastState = {
  aviso: UndoAviso | null;
  mostrar: (aviso: UndoAviso) => void;
  limpar: () => void;
};

export const useUndoToast = create<UndoToastState>()((set) => ({
  aviso: null,
  mostrar: (aviso) => set({ aviso }),
  limpar: () => set({ aviso: null }),
}));
