import { useReducedMotion } from 'react-native-reanimated';

import { useSettings } from '@/store/useSettings';

/**
 * Movimento reduzido: o do sistema **ou** o forçado em Ajustes (§5.6).
 * Todo componente animado usa este hook, nunca o `useReducedMotion` cru — senão
 * o interruptor da tela de Ajustes não faz nada.
 */
export function useReducedMotionPref(): boolean {
  const doSistema = useReducedMotion();
  const forcado = useSettings((s) => s.forceReducedMotion);
  return doSistema || forcado;
}
